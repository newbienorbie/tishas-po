import os
import shutil
import hashlib
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import utils

app = FastAPI(title="Tishas PO Extractor API")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "https://tishas-po.vercel.app"
]

# Add production domains from env
if os.getenv("ALLOWED_ORIGINS"):
    origins.extend(os.getenv("ALLOWED_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving uploaded PDFs
if not os.path.exists("po_storage"):
    os.makedirs("po_storage")
app.mount("/files", StaticFiles(directory="po_storage"), name="files")

# --- Pydantic Models for Input Validation ---

class Item(BaseModel):
    article_code: Optional[str] = None
    article_description: Optional[str] = None
    barcode: Optional[str] = None
    qty: Optional[float] = 0.0
    uom: Optional[str] = None
    unit_price: Optional[float] = 0.0
    total_price: Optional[float] = 0.0
    # Allow loose matching for flexible incoming data
    class Config:
        extra = "allow"

class PODocument(BaseModel):
    id: Optional[int] = None
    retailer_name: Optional[str] = None
    po_number: Optional[str] = None
    po_date: Optional[str] = None
    delivery_date: Optional[str] = None
    expiry_date: Optional[str] = None
    currency: Optional[str] = "MYR"
    total_amount: Optional[Any] = 0.0
    buyer_name: Optional[str] = None
    delivery_address: Optional[str] = None
    branch_name: Optional[str] = None
    branch_code: Optional[str] = None
    debtor_code: Optional[str] = None
    tax_id: Optional[str] = None
    file_hash: Optional[str] = None
    file_path_url: Optional[str] = None
    source_filename: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = []
    
    class Config:
        extra = "allow"

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Tishas PO Extractor API is running"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    temp_filename = f"temp_{file.filename}"
    original_filename = file.filename
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Calculate hash from the saved file to match utils logic expectation or read bytes
        with open(temp_filename, "rb") as f:
            file_hash = hashlib.md5(f.read()).hexdigest()

        # Upload to Storage (GCS or Local)
        saved_path = utils.upload_to_gcs(temp_filename, original_filename)
        
        # Process File
        file_ext = os.path.splitext(original_filename)[1].lower()
        results = []
        
        if file_ext == ".pdf":
            results = utils.process_pdf(temp_filename, file_hash, original_filename)
        elif file_ext in [".jpg", ".jpeg", ".png"]:
            results = utils.process_image(temp_filename, file_hash, original_filename)
        else:
             raise HTTPException(status_code=400, detail="Unsupported file format")

        if not results:
            raise HTTPException(status_code=400, detail="No data extracted from file. Please make sure it's a valid Purchase Order.")
        
        # Validate each extracted document
        validated_results = []
        for doc in results:
            # Validate if it's a PO
            is_valid, error_msg = utils.validate_is_po(doc)
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg or "Document does not appear to be a valid Purchase Order")
            
            # Add file metadata
            doc["file_path_url"] = saved_path
            doc["source_filename"] = original_filename
            
            # Check for duplicate PO number
            po_number = doc.get("po_number")
            if po_number and utils.check_po_number_exists(po_number):
                doc["already_exists"] = True
                doc["duplicate_message"] = f"PO {po_number} already exists in database"
            else:
                doc["already_exists"] = False
            
            validated_results.append(doc)
        
        return {"status": "success", "documents": validated_results}

    except HTTPException as he:
        print(f"HTTP Exception: {he.status_code} - {he.detail}")
        raise
    except Exception as e:
        print(f"Error processing file: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

@app.post("/api/save_all")
async def save_all_pos(pos: List[PODocument]):
    """Save multiple PO documents at once"""
    saved_count = 0
    failed_count = 0
    errors = []
    
    for po in pos:
        try:
            doc = po.model_dump()
            success = utils.save_to_db(doc)
            if success:
                saved_count += 1
            else:
                failed_count += 1
                errors.append(f"PO {doc.get('po_number', 'Unknown')} failed to save")
        except Exception as e:
            failed_count += 1
            errors.append(f"Error saving PO: {str(e)}")
    
    if saved_count > 0:
        return {
            "status": "success",
            "message": f"Saved {saved_count} POs successfully" + (f", {failed_count} failed" if failed_count > 0 else ""),
            "saved": saved_count,
            "failed": failed_count,
            "errors": errors if errors else None
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to save any POs. " + "; ".join(errors))

@app.post("/api/save")
async def save_po(po: PODocument):
    # Convert Pydantic model to dict
    doc = po.model_dump()
    
    # Handle potentially nested or non-standard item keys if needed, 
    # but utils.save_to_db expects a dict with keys matching what `utils.parse_with_gemini` creates.
    # The Pydantic model `extra="allow"` helps pass through everything.
    
    success = utils.save_to_db(doc)
    if success:
        return {"status": "success", "message": f"PO {doc.get('po_number')} saved."}
    else:
        raise HTTPException(status_code=500, detail="Failed to save PO to database.")

@app.get("/api/history")
def get_history():
    data = utils.fetch_all_pos_from_db()
    return data

@app.get("/api/check/{file_hash}")
def check_file(file_hash: str):
    exists = utils.check_if_exists(file_hash)
    return {"exists": exists}

@app.get("/api/check_po/{po_number}")
def check_po_number(po_number: str):
    exists = utils.check_po_number_exists(po_number)
    return {"exists": exists}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
