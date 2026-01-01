"""
Script to update retailer names back to MYDIN TRI SHAAS SDN BHD
Reverses the previous change and standardizes all TRI SHAAS entries
"""
import os
from dotenv import load_dotenv
from db_connection import get_db_connection

load_dotenv()

def update_to_mydin_tri_shaas():
    """Update all TRI SHAAS entries to 'MYDIN TRI SHAAS SDN BHD'"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Show current entries that need updating
        print("Current entries with TRI SHAAS or just MYDIN:")
        cursor.execute("""
            SELECT id, debtor_code, retailers_name, branch 
            FROM retailers 
            WHERE retailers_name LIKE '%TRI SHAAS%' 
               OR (retailers_name = 'MYDIN' AND debtor_code LIKE '300-M%')
            ORDER BY id
        """)
        rows = cursor.fetchall()
        
        for row in rows:
            print(f"  ID {row['id']}: {row['retailers_name']} - {row['branch']}")
        
        print(f"\nFound {len(rows)} entries to update")
        
        # Update to MYDIN TRI SHAAS SDN BHD
        print("\nUpdating retailers_name to 'MYDIN TRI SHAAS SDN BHD'...")
        cursor.execute("""
            UPDATE retailers 
            SET retailers_name = 'MYDIN TRI SHAAS SDN BHD'
            WHERE retailers_name LIKE '%TRI SHAAS%' 
               OR (retailers_name = 'MYDIN' AND debtor_code LIKE '300-M%')
        """)
        
        updated_count = cursor.rowcount
        conn.commit()
        
        print(f"✅ Updated {updated_count} rows successfully!")
        
        # Verify the changes
        print("\nVerifying changes:")
        cursor.execute("""
            SELECT id, debtor_code, retailers_name, branch 
            FROM retailers 
            WHERE retailers_name = 'MYDIN TRI SHAAS SDN BHD'
            ORDER BY id
        """)
        
        updated_rows = cursor.fetchall()
        for row in updated_rows:
            print(f"  ID {row['id']}: {row['retailers_name']} - {row['branch']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Updating to MYDIN TRI SHAAS SDN BHD")
    print("=" * 60)
    update_to_mydin_tri_shaas()
    print("\n" + "=" * 60)
    print("Done! Restart backend and re-upload PO files.")
    print("=" * 60)
