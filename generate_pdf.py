#!/usr/bin/env python3
"""
Generate PDF from Markdown file
Simple text-based PDF generation without external dependencies
"""

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

import re
import sys

def markdown_to_pdf_simple(md_file, pdf_file):
    """Simple markdown to PDF converter using reportlab"""
    
    if not REPORTLAB_AVAILABLE:
        print("❌ reportlab not available. Install with: pip install reportlab")
        print("📄 Markdown file created at:", md_file)
        print("🔗 You can convert to PDF using:")
        print("   - Online: https://www.markdowntopdf.com/")
        print("   - Pandoc: pandoc input.md -o output.pdf")
        print("   - VS Code: Markdown PDF extension")
        return False
    
    # Read markdown
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Create PDF
    doc = SimpleDocTemplate(pdf_file, pagesize=letter,
                           rightMargin=inch, leftMargin=inch,
                           topMargin=inch, bottomMargin=inch)
    
    # Container for elements
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading1_style = ParagraphStyle(
        'CustomHeading1',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=12,
        spaceBefore=12,
        fontName='Helvetica-Bold'
    )
    
    heading2_style = ParagraphStyle(
        'CustomHeading2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=10,
        spaceBefore=10,
        fontName='Helvetica-Bold'
    )
    
    heading3_style = ParagraphStyle(
        'CustomHeading3',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=colors.HexColor('#374151'),
        spaceAfter=8,
        spaceBefore=8,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#374151')
    )
    
    code_style = ParagraphStyle(
        'CustomCode',
        parent=styles['Code'],
        fontSize=9,
        leftIndent=20,
        textColor=colors.HexColor('#1f2937'),
        backColor=colors.HexColor('#f3f4f6')
    )
    
    # Parse markdown line by line
    lines = content.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines
        if not line:
            elements.append(Spacer(1, 6))
            i += 1
            continue
        
        # Title (# with single #)
        if line.startswith('# ') and not line.startswith('## '):
            text = line[2:].strip()
            elements.append(Paragraph(text, title_style))
            elements.append(Spacer(1, 12))
        
        # Heading 1 (##)
        elif line.startswith('## ') and not line.startswith('### '):
            text = line[3:].strip()
            if len(elements) > 0:
                elements.append(PageBreak())
            elements.append(Paragraph(text, heading1_style))
            elements.append(Spacer(1, 6))
        
        # Heading 2 (###)
        elif line.startswith('### ') and not line.startswith('#### '):
            text = line[4:].strip()
            elements.append(Paragraph(text, heading2_style))
            elements.append(Spacer(1, 6))
        
        # Heading 3 (####)
        elif line.startswith('#### '):
            text = line[5:].strip()
            elements.append(Paragraph(text, heading3_style))
            elements.append(Spacer(1, 4))
        
        # Horizontal rule
        elif line.startswith('---'):
            elements.append(Spacer(1, 6))
            elements.append(Table([['—' * 80]], colWidths=[7*inch]))
            elements.append(Spacer(1, 6))
        
        # Code block
        elif line.startswith('```'):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            code_text = '<br/>'.join(code_lines[:30])  # Limit code block length
            if len(code_lines) > 30:
                code_text += '<br/>... (truncated)'
            elements.append(Paragraph(code_text, code_style))
            elements.append(Spacer(1, 6))
        
        # Bullet list
        elif line.startswith('- ') or line.startswith('* '):
            text = line[2:].strip()
            # Handle checkboxes
            text = text.replace('✅', '☑').replace('❌', '☐').replace('⚠️', '⚠')
            bullet_text = f"• {text}"
            elements.append(Paragraph(bullet_text, body_style))
        
        # Numbered list
        elif re.match(r'^\d+\. ', line):
            text = re.sub(r'^\d+\. ', '', line)
            elements.append(Paragraph(text, body_style))
        
        # Table (simplified - just detect table rows)
        elif line.startswith('|'):
            table_rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                row = [cell.strip() for cell in lines[i].split('|')[1:-1]]
                if not all(cell.startswith('-') for cell in row):  # Skip separator rows
                    table_rows.append(row)
                i += 1
            
            if table_rows:
                # Create table
                t = Table(table_rows[:20])  # Limit table rows
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ]))
                elements.append(t)
                elements.append(Spacer(1, 12))
            continue  # Don't increment i again
        
        # Regular paragraph
        else:
            # Handle bold and italic (simplified)
            text = line
            text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
            text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
            # Handle inline code
            text = re.sub(r'`(.+?)`', r'<font face="Courier" size="9">\1</font>', text)
            # Handle links (simplified)
            text = re.sub(r'\[(.+?)\]\((.+?)\)', r'<u>\1</u>', text)
            
            elements.append(Paragraph(text, body_style))
        
        i += 1
    
    # Build PDF
    print("📄 Generating PDF...")
    doc.build(elements)
    print(f"✅ PDF created: {pdf_file}")
    return True

if __name__ == "__main__":
    md_file = "UNIVERSAL_POS_DEVELOPMENT_PLAN.md"
    pdf_file = "UNIVERSAL_POS_DEVELOPMENT_PLAN.pdf"
    
    success = markdown_to_pdf_simple(md_file, pdf_file)
    
    if not success:
        sys.exit(1)
