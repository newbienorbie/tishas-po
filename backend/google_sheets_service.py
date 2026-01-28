"""Google Sheets OAuth integration for PO export"""
import os
import json
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load env vars from .env file immediately
load_dotenv()

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError



# OAuth 2.0 scopes
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
]

def get_oauth_flow(redirect_uri: str) -> Flow:
    """Create OAuth flow for Google Sheets"""
    client_config = {
        "web": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "redirect_uris": [redirect_uri],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    return flow


def create_spreadsheet_from_pos(credentials_dict: Dict[str, Any], po_data: List[Dict[str, Any]], title: str = "PO Export", view_mode: str = "item_level") -> str:
    """
    Create a Google Spreadsheet in the user's Drive and populate it with PO data
    
    Args:
        credentials_dict: OAuth credentials dictionary
        po_data: List of PO documents
        title: Spreadsheet title
        view_mode: 'po_level' (summary) or 'item_level' (with line items)
        
    Returns:
        Spreadsheet URL
    """
    credentials = Credentials(**credentials_dict)
    
    try:
        # Build Sheets API service
        service = build('sheets', 'v4', credentials=credentials)
        
        # Create new spreadsheet
        spreadsheet = {
            'properties': {
                'title': title
            }
        }
        spreadsheet = service.spreadsheets().create(body=spreadsheet, fields='spreadsheetId,spreadsheetUrl').execute()
        spreadsheet_id = spreadsheet.get('spreadsheetId')
        spreadsheet_url = spreadsheet.get('spreadsheetUrl')
        
        # Helper to safely format value
        def format_val(val):
            return str(val) if val else ""
        
        # Build headers and rows based on view_mode
        if view_mode == 'po_level':
            # PO Summary view - one row per PO (no line items)
            headers = [
                'PO Number', 'Retailer', 'Debtor Code', 'Branch', 'Branch Code',
                'PO Date', 'Delivery Date', 'Expiry Date',
                'Delivery Address', 'Billing Address', 'Total Amount', 'Source'
            ]
            
            # Group by PO number to get unique POs
            po_map = {}
            for doc in po_data:
                po_num = doc.get('po_number', '')
                if po_num and po_num not in po_map:
                    po_map[po_num] = doc
            
            rows = [headers]
            for doc in po_map.values():
                rows.append([
                    doc.get('po_number', ''),
                    doc.get('retailer_name', ''),
                    doc.get('debtor_code', ''),
                    doc.get('branch_name', ''),
                    doc.get('branch_code', ''),
                    format_val(doc.get('po_date')),
                    format_val(doc.get('delivery_date')),
                    format_val(doc.get('expiry_date')),
                    doc.get('delivery_address', ''),
                    doc.get('billing_address', ''),
                    str(doc.get('total_amount', '')),
                    doc.get('file_storage_url', '') or doc.get('file_path_url', '')
                ])
        else:
            # Item Level view - one row per line item
            headers = [
                'PO Number', 'Retailer', 'Debtor Code', 'Branch', 'Branch Code',
                'PO Date', 'Delivery Date', 'Expiry Date',
                'Delivery Address', 'Billing Address', 'Total Amount',
                'Article Code', 'Description', 'Qty', 'UOM', 'Unit Price', 'Line Total', 'Source'
            ]
            
            rows = [headers]
            for doc in po_data:
                items = doc.get('items', [])
                if items:
                    for item in items:
                        rows.append([
                            doc.get('po_number', ''),
                            doc.get('retailer_name', ''),
                            doc.get('debtor_code', ''),
                            doc.get('branch_name', ''),
                            doc.get('branch_code', ''),
                            format_val(doc.get('po_date')),
                            format_val(doc.get('delivery_date')),
                            format_val(doc.get('expiry_date')),
                            doc.get('delivery_address', ''),
                            doc.get('billing_address', ''),
                            str(doc.get('total_amount', '')),
                            item.get('article_code', ''),
                            item.get('description', ''),
                            str(item.get('qty', '')),
                            item.get('uom', ''),
                            str(item.get('unit_price', '')),
                            str(item.get('total', '')),
                            doc.get('file_storage_url', '') or doc.get('file_path_url', '')
                        ])
                else:
                    # PO with no items - still include it
                    rows.append([
                        doc.get('po_number', ''),
                        doc.get('retailer_name', ''),
                        doc.get('debtor_code', ''),
                        doc.get('branch_name', ''),
                        doc.get('branch_code', ''),
                        format_val(doc.get('po_date')),
                        format_val(doc.get('delivery_date')),
                        format_val(doc.get('expiry_date')),
                        doc.get('delivery_address', ''),
                        doc.get('billing_address', ''),
                        str(doc.get('total_amount', '')),
                        '', '', '', '', '', '',
                        doc.get('file_storage_url', '') or doc.get('file_path_url', '')
                    ])
        
        # Write data to sheet
        body = {
            'values': rows
        }
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range='A1',
            valueInputOption='RAW',
            body=body
        ).execute()
        
        # Format header row (bold, frozen)
        requests = [
            {
                'repeatCell': {
                    'range': {
                        'sheetId': 0,
                        'startRowIndex': 0,
                        'endRowIndex': 1
                    },
                    'cell': {
                        'userEnteredFormat': {
                            'textFormat': {
                                'bold': True
                            },
                            'backgroundColor': {
                                'red': 0.9,
                                'green': 0.9,
                                'blue': 0.9
                            }
                        }
                    },
                    'fields': 'userEnteredFormat(textFormat,backgroundColor)'
                }
            },
            {
                'updateSheetProperties': {
                    'properties': {
                        'sheetId': 0,
                        'gridProperties': {
                            'frozenRowCount': 1
                        }
                    },
                    'fields': 'gridProperties.frozenRowCount'
                }
            }
        ]
        
        service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={'requests': requests}
        ).execute()
        
        return spreadsheet_url
        
    except HttpError as error:
        print(f"An error occurred: {error}")
        raise


def refresh_credentials(credentials_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Refresh OAuth credentials if expired"""
    credentials = Credentials(**credentials_dict)
    
    if credentials.expired and credentials.refresh_token:
        from google.auth.transport.requests import Request
        credentials.refresh(Request())
        
        return {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
    
    return credentials_dict
