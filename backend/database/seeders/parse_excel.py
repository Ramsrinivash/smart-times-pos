import sys
import zipfile
import xml.etree.ElementTree as ET
import datetime
import json
import re
import os

def excel_date_to_iso(serial):
    try:
        val = float(serial)
        if val <= 0:
            return None
        dt = datetime.datetime(1899, 12, 30) + datetime.timedelta(days=val)
        return dt.strftime('%Y-%m-%d')
    except Exception:
        return None

def parse_service_book(filename):
    z = zipfile.ZipFile(filename)
    ss_tree = ET.fromstring(z.read('xl/sharedStrings.xml')) if 'xl/sharedStrings.xml' in z.namelist() else None
    strings = []
    if ss_tree is not None:
        for t in ss_tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
            strings.append(t.text if t.text else '')

    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    records = []
    seen_job_ids = set()

    sheet_files = [f for f in z.namelist() if f.startswith('xl/worksheets/sheet') and f.endswith('.xml') and not 'rels' in f]

    for sheet_file in sheet_files:
        tree = ET.fromstring(z.read(sheet_file))
        rows = tree.findall('ns:sheetData/ns:row', ns)
        for row in rows:
            cells = []
            for c in row.findall('ns:c', ns):
                t = c.get('t')
                v = c.find('ns:v', ns)
                val = v.text if v is not None else ''
                if t == 's' and val and val.isdigit():
                    idx = int(val)
                    val = strings[idx] if idx < len(strings) else ''
                cells.append(val if val is not None else '')

            if not cells or len(cells) < 4:
                continue

            job_id_raw = str(cells[0]).strip()
            name = str(cells[1]).strip() if len(cells) > 1 else ''

            if not job_id_raw or job_id_raw.lower() in ['service id', 'sl.no', 'id', 's.no'] or name.lower() in ['customer name', 'name']:
                continue

            if job_id_raw in seen_job_ids:
                continue

            phone = str(cells[2]).strip() if len(cells) > 2 else ''
            phone_clean = re.sub(r'\D', '', phone)
            if len(phone_clean) > 10:
                phone_clean = phone_clean[-10:]
            if not phone_clean:
                phone_clean = '0000000000'

            brand = str(cells[3]).strip() if len(cells) > 3 else 'Watch'
            model = str(cells[4]).strip() if len(cells) > 4 else ''
            issue = str(cells[5]).strip() if len(cells) > 5 else 'General Service'
            
            received_date = excel_date_to_iso(cells[6]) if len(cells) > 6 else None
            expected_date = excel_date_to_iso(cells[7]) if len(cells) > 7 else None
            
            cost_raw = str(cells[8]).strip() if len(cells) > 8 else '0'
            try:
                actual_cost = float(cost_raw) if cost_raw else 0.0
            except:
                actual_cost = 0.0

            raw_status = str(cells[11]).strip().lower() if len(cells) > 11 else 'received'
            if 'deliver' in raw_status:
                status = 'delivered'
            elif 'ready' in raw_status:
                status = 'ready'
            elif 'repair' in raw_status or 'process' in raw_status:
                status = 'in_repair'
            else:
                status = 'received'

            delivery_date = excel_date_to_iso(cells[12]) if len(cells) > 12 else None

            seen_job_ids.add(job_id_raw)
            records.append({
                'job_id': f"JC-{job_id_raw}",
                'customer_name': name,
                'phone': phone_clean,
                'brand': brand,
                'model': model,
                'issue': issue,
                'received_date': received_date or '2026-01-01',
                'expected_delivery_date': expected_date or '2026-01-05',
                'actual_delivery_date': delivery_date,
                'actual_cost': actual_cost,
                'status': status
            })

    return records

if __name__ == '__main__':
    file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'Servive_Book.xlsx'))
    records = parse_service_book(file_path)
    print(f"Parsed {len(records)} valid service records from Servive_Book.xlsx")
    out_path = os.path.join(os.path.dirname(__file__), 'parsed_services.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
