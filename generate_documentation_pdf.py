"""
generate_documentation_pdf.py
Generates a comprehensive, publication-quality PDF document covering the
MADHUKAR AI Crime Intelligence Platform architecture, features, workflows, and tech stack.
"""

import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# ─── Numbered Canvas for "Page X of Y" and Running Headers ───────────────────
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_elements(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_elements(self, page_count):
        if self._pageNumber == 1:
            # Suppress header/footer on cover page
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#4A5568"))

        # Running Header
        self.drawString(54, 11 * 72 - 36, "KARNATAKA STATE POLICE — MADHUKAR AI PLATFORM DOCUMENTATION")
        self.drawRightString(8.5 * 72 - 54, 11 * 72 - 36, "CONFIDENTIAL // RESTRICTED")
        self.setStrokeColor(colors.HexColor("#CBD5E0"))
        self.setLineWidth(0.5)
        self.line(54, 11 * 72 - 42, 8.5 * 72 - 54, 11 * 72 - 42)

        # Running Footer
        self.line(54, 45, 8.5 * 72 - 54, 45)
        self.drawString(54, 32, "Modern Analytics & Data Hub for User-Friendly Karnataka Anti-Crime Response Dashboard")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * 72 - 54, 32, page_str)
        self.restoreState()


def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # ── Custom Palette ──
    PRIMARY = colors.HexColor("#0F2942")     # Deep Navy
    SECONDARY = colors.HexColor("#1A5F7A")   # Police Teal / Blue
    ACCENT = colors.HexColor("#2B6CB0")      # Bright Blue
    TEXT_DARK = colors.HexColor("#2D3748")   # Charcoal
    TEXT_MUTED = colors.HexColor("#718096")  # Slate Gray
    BG_LIGHT = colors.HexColor("#F7FAFC")    # Off-white
    BORDER_COL = colors.HexColor("#E2E8F0")

    # ── Custom Styles ──
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=PRIMARY,
        alignment=0
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        alignment=0
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1A365D"),
        spaceAfter=6
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_DARK
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#2C5282")
    )

    story = []

    # ══════════════════════════════════════════════════════════════════════════
    # COVER PAGE
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 40))
    story.append(Paragraph("GOVERNMENT OF KARNATAKA", ParagraphStyle('Gov', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=SECONDARY)))
    story.append(Paragraph("KARNATAKA STATE POLICE (KSP)", ParagraphStyle('Police', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=PRIMARY)))
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=4, color=ACCENT, spaceAfter=20))

    story.append(Paragraph("MADHUKAR AI", title_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>M</b>odern <b>A</b>nalytics and <b>D</b>ata <b>H</b>ub for <b>U</b>ser-Friendly <b>K</b>arnataka <b>A</b>nti-Crime <b>R</b>esponse Platform", subtitle_style))
    story.append(Spacer(1, 15))
    story.append(Paragraph("Complete Technical & Non-Technical Architecture, Feature Workflows, Data Pipeline & System Specifications", ParagraphStyle('Desc', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=TEXT_DARK)))

    story.append(Spacer(1, 35))

    # Meta box
    meta_data = [
        [Paragraph("<b>Document Version:</b>", table_cell), Paragraph("1.0 (Production Candidate)", table_cell)],
        [Paragraph("<b>Target Event:</b>", table_cell), Paragraph("KSP Datathon 2026 Grand Finale — Bangalore (Sept 18, 2026)", table_cell)],
        [Paragraph("<b>Classification:</b>", table_cell), Paragraph("<font color='#C53030'><b>RESTRICTED // INTERNAL DEV TEAM ONLY</b></font>", table_cell)],
        [Paragraph("<b>Prepared By:</b>", table_cell), Paragraph("MADHUKAR AI Core Engineering Team", table_cell)],
        [Paragraph("<b>Cloud Platform:</b>", table_cell), Paragraph("Zoho Catalyst (Serverless + DataStore + QuickML GLM-4.7)", table_cell)],
        [Paragraph("<b>Frontend Framework:</b>", table_cell), Paragraph("React 19 SPA + Leaflet GIS + Recharts + OTPAuth", table_cell)],
    ]
    meta_table = Table(meta_data, colWidths=[140, 364])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COL),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, BORDER_COL),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 40))
    story.append(Paragraph("<b>NOTICE:</b> This specification outlines the end-to-end architecture, backend microservices, mathematical security models, and frontend interfaces for the prototype presented in the Top 10 Finals. Do not publish API secrets, TOTP keys, or live police datasets.", callout_style))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # 1. EXECUTIVE SUMMARY & SYSTEM OVERVIEW
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Executive Summary & System Overview", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=10))

    story.append(Paragraph("<b>Non-Technical Perspective (For Police Leadership & Jury):</b>", h2_style))
    story.append(Paragraph(
        "Modern police forces generate thousands of First Information Reports (FIRs) every month across dozens of police stations. "
        "Traditionally, identifying criminal patterns across district boundaries requires manual intelligence coordination, phone calls, "
        "and physical register cross-referencing. <b>MADHUKAR AI</b> transforms this workflow into an autonomous, real-time command center. "
        "An Investigating Officer (IO) or Police Commissioner can open the platform, view citywide crime severity heatmaps, immediately see repeat "
        "offender linkages across different police stations, and ask complex investigation questions in plain English or Kannada — receiving instant, "
        "forensically accurate intelligence answers.", body_style
    ))

    story.append(Paragraph("<b>Technical Perspective (For Software Architects & Evaluators):</b>", h2_style))
    story.append(Paragraph(
        "MADHUKAR AI is a cloud-native, serverless intelligence architecture hosted on <b>Zoho Catalyst</b>. It features an in-process "
        "high-speed data cache (<code>dataCache.js</code>) that unifies 26 relational DataStore tables into pre-joined operational views. "
        "The intelligence layer integrates <b>GLM-4.7-Flash</b> (a 30-Billion parameter Mixture-of-Experts neural model via Catalyst QuickML) "
        "running an automated tool-calling loop that translates natural language queries into deterministic database queries. "
        "Security is governed by an enterprise-grade Zero-Trust model featuring <b>hardware-backed per-officer TOTP 2FA</b> (AES-256-GCM encrypted "
        "secrets stored in DataStore with QR onboarding) protecting all Personally Identifiable Information (PII) under the Digital Personal "
        "Data Protection (DPDP) Act standards.", body_style
    ))

    # Core Value Pillars Table
    pillars_data = [
        [Paragraph("Pillar", table_header), Paragraph("Operational Impact", table_header), Paragraph("Technical Mechanism", table_header)],
        [
            Paragraph("<b>Predictive Hotspots</b>", table_cell),
            Paragraph("Enables preventative patrol allocation before crimes occur.", table_cell),
            Paragraph("Kernel density estimation + 30-day rolling severity forecasts.", table_cell)
        ],
        [
            Paragraph("<b>Forensic MO Linkage</b>", table_cell),
            Paragraph("Detects inter-district serial offenders automatically.", table_cell),
            Paragraph("Statistical scoring engine (0-100) with cross-category gate.", table_cell)
        ],
        [
            Paragraph("<b>MADHUKAR AI Copilot</b>", table_cell),
            Paragraph("Zero-training conversational investigation assistant.", table_cell),
            Paragraph("GLM-4.7-Flash MoE LLM with automated ReAct tool-calling.", table_cell)
        ],
        [
            Paragraph("<b>Zero-Trust PII 2FA</b>", table_cell),
            Paragraph("Protects victim & witness identities with strict audit trails.", table_cell),
            Paragraph("Per-user AES-256 TOTP QR setup + self-service email OTP recovery.", table_cell)
        ],
    ]
    t_pillars = Table(pillars_data, colWidths=[120, 194, 190])
    t_pillars.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COL),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
    ]))
    story.append(t_pillars)
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    # 2. COMPLETE TECH STACK BREAKDOWN
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. Deep Tech Stack Specifications", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=10))

    stack_data = [
        [Paragraph("Layer", table_header), Paragraph("Technology & Version", table_header), Paragraph("Purpose & Architectural Rationale", table_header)],
        [
            Paragraph("<b>Frontend Framework</b>", table_cell),
            Paragraph("React 19.2.7 + React Router 7.18.1", table_cell),
            Paragraph("Modern functional components with custom hooks. Fast DOM reconciliation for real-time charts.", table_cell)
        ],
        [
            Paragraph("<b>GIS & Mapping</b>", table_cell),
            Paragraph("Leaflet 1.9.4 + React-Leaflet 5.0.0<br/>Leaflet.heat 0.2.0 + Turf.js 7.3.5", table_cell),
            Paragraph("Hardware-accelerated GIS rendering. Dynamic marker clustering (1,000+ pins) & thermal heatmaps without UI freeze.", table_cell)
        ],
        [
            Paragraph("<b>Visual Analytics</b>", table_cell),
            Paragraph("Recharts 3.9.2", table_cell),
            Paragraph("SVG-based responsive charts with custom tooltips, theme adaptation, and time-slice animations.", table_cell)
        ],
        [
            Paragraph("<b>Serverless Backend</b>", table_cell),
            Paragraph("Node.js LTS + Express.js 4.18.2<br/>(Zoho Catalyst Functions)", table_cell),
            Paragraph("Zero-maintenance auto-scaling serverless microservice running the unified <code>crime_api</code> API hub.", table_cell)
        ],
        [
            Paragraph("<b>Primary Database</b>", table_cell),
            Paragraph("Catalyst Data Store (26 Tables)<br/>ZCQL Query Engine", table_cell),
            Paragraph("Managed relational-structured storage. ZCQL queries with multi-table joins and row-level security.", table_cell)
        ],
        [
            Paragraph("<b>AI / LLM Engine</b>", table_cell),
            Paragraph("GLM-4.7-Flash (30B MoE)<br/>Catalyst QuickML Endpoint", table_cell),
            Paragraph("High-performance Mixture-of-Experts foundation model handling domain-specific criminal law tool-calling.", table_cell)
        ],
        [
            Paragraph("<b>MFA & Cryptography</b>", table_cell),
            Paragraph("Node.js Crypto (native)<br/>AES-256-GCM + RFC 6238 TOTP", table_cell),
            Paragraph("Zero-dependency cryptographic verification. Eliminates supply chain risks. Mobile Authenticator compatible.", table_cell)
        ],
        [
            Paragraph("<b>Reporting & Export</b>", table_cell),
            Paragraph("jsPDF 2.5.2 + AutoTable 3.8.4<br/>html2canvas 1.4.1", table_cell),
            Paragraph("Client-side direct PDF generation with high-resolution canvas capture for immediate printed intelligence reports.", table_cell)
        ],
    ]
    t_stack = Table(stack_data, colWidths=[110, 150, 244])
    t_stack.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COL),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
    ]))
    story.append(t_stack)
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # 3. DATA ARCHITECTURE & 26-TABLE SCHEMA
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. Data Architecture & Relational Schema", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=10))

    story.append(Paragraph(
        "The Karnataka State Police FIR database contains 26 normalized tables. "
        "To achieve millisecond page loads without running hundreds of separate database queries, "
        "MADHUKAR AI utilizes a two-tier caching and schema selector pipeline.", body_style
    ))

    tables_summary = [
        [Paragraph("Category", table_header), Paragraph("Table Name", table_header), Paragraph("Primary Fields", table_header), Paragraph("Operational Function", table_header)],
        [
            Paragraph("<b>Core Records</b>", table_cell),
            Paragraph("<code>CaseMaster</code>", code_style),
            Paragraph("CaseMasterID, CrimeNo, DistrictID, PoliceStationID, CrimeMajorHeadID, CrimeMinorHeadID, BriefFacts, Lat, Lng", table_cell),
            Paragraph("Master FIR registry containing every reported crime incident.", table_cell)
        ],
        [
            Paragraph("<b>Persons Involved</b>", table_cell),
            Paragraph("<code>Accused</code><br/><code>Victim</code><br/><code>ComplainantDetails</code>", code_style),
            Paragraph("Name, Age, Gender, Profession, CasteID, CaseMasterID", table_cell),
            Paragraph("PII-protected tables recording individuals associated with cases.", table_cell)
        ],
        [
            Paragraph("<b>Investigation</b>", table_cell),
            Paragraph("<code>ArrestSurrender</code><br/><code>ChargesheetDetails</code>", code_style),
            Paragraph("AccusedID, ArrestDate, CSType (A/B/C), FilingDate", table_cell),
            Paragraph("Tracks apprehension, custody, and judicial chargesheet filings.", table_cell)
        ],
        [
            Paragraph("<b>Crime Taxonomy</b>", table_cell),
            Paragraph("<code>CrimeHead</code><br/><code>CrimeSubHead</code><br/><code>Section</code><br/><code>Act</code>", code_style),
            Paragraph("CrimeMajorHeadID, CrimeMinorHeadID, ActSection, OffenceSeverity", table_cell),
            Paragraph("10 Major Heads + 50 Sub-heads mapped to Indian Penal Code / BNS sections.", table_cell)
        ],
        [
            Paragraph("<b>Geo-Jurisdiction</b>", table_cell),
            Paragraph("<code>District</code><br/><code>Unit</code> (Police Station)<br/><code>Employee</code>", code_style),
            Paragraph("DistrictID, DistrictName, UnitID, PolicePersonID, Designation", table_cell),
            Paragraph("30 Karnataka districts, hundreds of police units, and officer rosters.", table_cell)
        ],
        [
            Paragraph("<b>Security & 2FA</b>", table_cell),
            Paragraph("<code>UserMFA</code>", code_style),
            Paragraph("UserEmail, EncryptedSecret, IsActive, LastVerifiedAt, BackupCodes", table_cell),
            Paragraph("Persistent per-officer TOTP secrets (AES-256 encrypted).", table_cell)
        ],
    ]
    t_tab = Table(tables_summary, colWidths=[90, 110, 164, 140])
    t_tab.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COL),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
    ]))
    story.append(t_tab)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>The 10 Authoritative KSP Crime Major Heads:</b>", h2_style))
    heads_text = (
        "1. <b>Crimes Against Body</b> (Murder, Assault, Kidnapping) | "
        "2. <b>Crimes Against Property</b> (Burglary, Dacoity, Robbery, Theft) | "
        "3. <b>Crimes Against Women</b> (Cruelty, Dowry Death, Molestation) | "
        "4. <b>Crimes Against Children</b> (POCSO, Child Labour) | "
        "5. <b>Cyber Crimes</b> (UPI Fraud, Identity Theft, Hacking) | "
        "6. <b>Economic Offences</b> (Cheating, Bank Fraud, Counterfeiting) | "
        "7. <b>Narcotics</b> (NDPS Act, Ganja, Trafficking) | "
        "8. <b>Public Order</b> (Rioting, Unlawful Assembly) | "
        "9. <b>Arms Act</b> (Illegal Firearm Possession) | "
        "10. <b>Crimes Against SC/ST</b> (POA Act Atrocities)."
    )
    story.append(Paragraph(heads_text, body_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Data Cache Pipeline (dataCache.js):</b>", h2_style))
    story.append(Paragraph(
        "To achieve zero-lag responses across the application, <code>dataCache.js</code> runs an in-memory cache in the serverless function. "
        "On initial cold start, it executes parallel ZCQL queries across all 26 tables using <code>Promise.all()</code>. Large datasets like "
        "<code>CaseMaster</code> are paged using offset cursors (300 rows/page). Once warmed, the entire operational schema is served from memory "
        "with a <b>5-minute TTL</b>. Frontend consumers request <code>/api/app-data</code> once on launch, hydrate the client-side store, "
        "and navigate between pages with instant 0-millisecond response times.", body_style
    ))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # 4. FEATURE-BY-FEATURE WORKFLOW & TECHNICAL SPECIFICATION
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("4. Feature-by-Feature Operational Workflows", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=10))

    # Feature 1: Modern Command Center Dashboard
    story.append(Paragraph("4.1 Command Center Dashboard (Home / Operations)", h2_style))
    story.append(Paragraph(
        "<b>Non-Technical Flow:</b> The primary screen displayed on command center video walls. Officers monitor state-wide active cases, "
        "heinous crimes requiring immediate senior intervention, monthly crime rate trajectories, and district-by-district workload distributions.", body_style
    ))
    story.append(Paragraph(
        "<b>Technical Details:</b> Routed at <code>/</code> (<code>DashboardModern.js</code>). Consumes normalized <code>caseViews[]</code> "
        "from <code>schemaSelectors.js</code>. Integrates <code>DateFilterContext</code> for dynamic time windows (7D, 30D, 90D, 1Y, Custom). "
        "Renders 4 top-level KPI metric cards, a 12-month area trend chart, a 10-category donut breakdown, and an interactive Heinous Crime "
        "Action Queue. Utilizes <code>resolveCrimeMajorHead()</code> to ensure zero misclassifications.", body_style
    ))
    story.append(Spacer(1, 8))

    # Feature 2: GIS Spatial Crime Map
    story.append(Paragraph("4.2 GIS Spatial Crime Map & Heatmap Analysis", h2_style))
    story.append(Paragraph(
        "<b>Non-Technical Flow:</b> An interactive geographic map of Karnataka. Commanders can zoom from statewide views down to individual "
        "street corners, switch to a thermal heat-glow mode to spot crime clusters, and click any incident pin to inspect the FIR summary.", body_style
    ))
    story.append(Paragraph(
        "<b>Technical Details:</b> Routed at <code>/map</code> (<code>CrimeMap.js</code>). Powered by Leaflet.js with dynamic tile switching "
        "(CartoDB Dark/Light). Features <b>Leaflet.markercluster</b> for client-side spatial indexing of 1,000+ incidents and <b>Leaflet.heat</b> "
        "for Gaussian density mapping. Uses <b>@turf/turf</b> for centroid and radius calculations. Marker pins are dynamically color-coded by "
        "Crime Major Head ID.", body_style
    ))
    story.append(Spacer(1, 8))

    # Feature 3: Criminal Network Graph
    story.append(Paragraph("4.3 Criminal Network Intelligence Graph", h2_style))
    story.append(Paragraph(
        "<b>Non-Technical Flow:</b> Reveals hidden syndicates and multi-case offender networks. When a serial burglar or gang operates across "
        "different police stations under different FIRs, this graph automatically links the cases together based on shared accomplices and identical modus operandi.", body_style
    ))
    story.append(Paragraph(
        "<b>Technical Details:</b> Routed at <code>/network</code> (<code>NetworkGraph.js</code>). Built on a high-performance HTML5 Canvas "
        "force-directed graph engine. Nodes represent Criminals (Red), Cases (Blue), Police Stations (Purple), and Victims (Green). "
        "Edge generation is powered by the custom <b>Forensic Similarity Engine</b> (<code>similarityEngine.js</code>). Includes a sleek "
        "<b>Time Range Filter Slider</b> and a <b>Similar Pattern Matches (MO) Toggle</b>.", body_style
    ))
    story.append(Spacer(1, 8))

    # Feature 4: Case Overview & Investigation Desk
    story.append(Paragraph("4.4 Case Overview & AI Pattern Linkages", h2_style))
    story.append(Paragraph(
        "<b>Non-Technical Flow:</b> The core investigative dossier for individual FIRs. Displays case facts, registered legal sections, "
        "assigned investigating officers, and an AI-generated list of similar past cases that may help solve the current investigation.", body_style
    ))
    story.append(Paragraph(
        "<b>Technical Details:</b> Routed at <code>/cases/:caseId</code> (<code>CaseOverview.js</code>). Embeds mini-GIS coordinates, "
        "investigation timelines, and chargesheet milestones. Employs <code>findSimilarCases()</code> to compute pairwise forensic similarity "
        "scores across the entire database, surfacing top-5 matches with score percentages (≥ 60%). Protects sensitive details with the PII Redaction Guard.", body_style
    ))
    story.append(PageBreak())

    # Feature 5: MADHUKAR AI Copilot
    story.append(Paragraph("4.5 MADHUKAR AI Investigation Copilot", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=10))

    story.append(Paragraph(
        "<b>Non-Technical Flow:</b> A conversational AI assistant tailored specifically for police officers. Officers can ask questions in natural "
        "language — such as <i>'Show me all robbery repeat offenders in Mysuru during August'</i> or <i>'Which police station reported the most cyber fraud?'</i> — "
        "and receive precise analytical answers accompanied by case tables and visual charts.", body_style
    ))
    story.append(Paragraph(
        "<b>Technical Architecture & Tool-Calling Loop:</b> Hosted at <code>/copilot</code> with backend in <code>copilotEngine.js</code> and "
        "<code>glmClient.js</code>. Rather than relying on simple prompt engineering, the engine implements a full <b>ReAct (Reasoning + Action)</b> "
        "tool-calling loop using Catalyst's <b>GLM-4.7-Flash (30B MoE)</b> foundation model.", body_style
    ))

    # Step-by-step Copilot table
    copilot_steps = [
        [Paragraph("Step", table_header), Paragraph("Actor", table_header), Paragraph("Operation & Technical Detail", table_header)],
        [
            Paragraph("1. Query Input", table_cell),
            Paragraph("Officer (UI)", table_cell),
            Paragraph("Submits natural language prompt via chat bar. Frontend posts to <code>/api/copilot/chat</code>.", table_cell)
        ],
        [
            Paragraph("2. Intent Parsing", table_cell),
            Paragraph("copilotEngine", table_cell),
            Paragraph("Scans prompt for 30 district names, 8 crime keyword groups, temporal keywords (today, month, year).", table_cell)
        ],
        [
            Paragraph("3. LLM Prompting", table_cell),
            Paragraph("glmClient", table_cell),
            Paragraph("Sends conversation history + system prompt + tool declarations to Catalyst QuickML endpoint.", table_cell)
        ],
        [
            Paragraph("4. Tool Calling", table_cell),
            Paragraph("GLM-4.7-Flash", table_cell),
            Paragraph("Model determines it needs database facts and emits a tool-call (e.g. <code>getCaseStats({district:'mysuru', crime:'robbery'})</code>).", table_cell)
        ],
        [
            Paragraph("5. Execution", table_cell),
            Paragraph("dataCache", table_cell),
            Paragraph("Backend executes tool against in-memory cache, formats JSON result, and feeds back to LLM.", table_cell)
        ],
        [
            Paragraph("6. Response", table_cell),
            Paragraph("GLM → UI", table_cell),
            Paragraph("Model synthesizes findings into professional police intelligence prose with actionable recommendations.", table_cell)
        ],
    ]
    t_copilot = Table(copilot_steps, colWidths=[80, 90, 334])
    t_copilot.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COL),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
    ]))
    story.append(t_copilot)
    story.append(Spacer(1, 14))

    # Feature 6: Predictive Analytics
    story.append(Paragraph("4.6 Predictive Crime Intelligence & Risk Scoring", h2_style))
    story.append(Paragraph(
        "<b>Non-Technical Flow:</b> Helps leadership deploy police patrols proactively. Evaluates historical recurrence patterns to identify "
        "which stations and districts are forecasted to experience crime surges over the next 30 days.", body_style
    ))
    story.append(Paragraph(
        "<b>Technical Details:</b> Routed at <code>/predictions</code> (<code>Predictions.js</code>). Implements a multi-factor risk scoring "
        "algorithm combining: Heinous status (+40 pts), Repeat offender history (+15 pts/incident), Unresolved investigation aging (+20 pts), "
        "and Station geographic density. Displays 30-day forecast curves with 7-day moving averages and geographical anomaly detectors.", body_style
    ))
    story.append(Spacer(1, 10))

    # Feature 7: Statistics & Demographics
    story.append(Paragraph("4.7 Comprehensive Crime Statistics & Demographics", h2_style))
    story.append(Paragraph(
        "<b>Non-Technical Flow:</b> Analytical workspace for criminologists and senior statisticians. Explores temporal crime rhythms "
        "(what time of day and what days of the week crimes occur) alongside victim and accused demographic breakdowns.", body_style
    ))
    story.append(Paragraph(
        "<b>Technical Details:</b> Routed at <code>/statistics</code> (modularized into <code>features/statistics/</code>). Renders: "
        "24-hour diurnal crime curve, 7-day weekly cadence bar charts, 10-head comparative volumes, Chargesheet A/B/C ratio pies, and "
        "bivariate demographic distributions (Age, Gender, Occupation, Caste).", body_style
    ))
    story.append(PageBreak())

    # Feature 8: Reports Engine
    story.append(Paragraph("4.8 Automated Operational Reports Generator", h2_style))
    story.append(Paragraph(
        "<b>Non-Technical Flow:</b> One-click generation of official, printable police reports. Officers can select daily station summaries, "
        "heinous crime briefs, or monthly district reviews and export polished PDFs ready for court or ministry presentation.", body_style
    ))
    story.append(Paragraph(
        "<b>Technical Details:</b> Routed at <code>/reports</code> (<code>Reports.js</code>). Implements client-side compilation using "
        "<b>jsPDF</b> and <b>jsPDF-AutoTable</b> with <b>html2canvas</b> for embedding visual charts. Supports 6 standard templates, "
        "multi-column data formatting, and instant CSV/JSON exports via <code>fileExports.js</code>.", body_style
    ))
    story.append(Spacer(1, 10))

    # Feature 9: Suspect Timeline & Evidence Workspace
    story.append(Paragraph("4.9 Suspect History Timeline & Evidence Workspace", h2_style))
    story.append(Paragraph(
        "<b>Non-Technical Flow:</b> Provides deep criminal tracking. Displays a chronological vertical timeline of an accused person's entire criminal "
        "career across Karnataka, linking every arrest, bail status, and court hearing. The Evidence Workspace acts as a digital case diary for forensic items.", body_style
    ))
    story.append(Paragraph(
        "<b>Technical Details:</b> Routed at <code>/suspect-timeline</code> and <code>/evidence-workspace</code>. Links cross-case accused records "
        "using normalized name fuzzy-matching and KGID officer associations. Gated with PII access control.", body_style
    ))
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    # 5. SECURITY ARCHITECTURE & DYNAMIC TOTP 2FA
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. Security Architecture & Zero-Trust PII 2FA", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=10))

    story.append(Paragraph(
        "Under the Digital Personal Data Protection (DPDP) Act and police security protocols, crime records contain sensitive Personally "
        "Identifiable Information (PII) — including victim identities, minor records (POCSO), and witness contact details. "
        "MADHUKAR AI implements a strict <b>Zero-Trust Break-Glass Model</b>.", body_style
    ))

    # Security Comparison Table
    sec_data = [
        [Paragraph("State / Role", table_header), Paragraph("PII Visibility", table_header), Paragraph("Cryptographic & Session Controls", table_header)],
        [
            Paragraph("<b>Default State</b><br/>(Any Analyst / Viewer)", table_cell),
            Paragraph("<font color='#C53030'><b>REDACTED</b></font><br/>Names: <code>[REDACTED - PII PROTECTED]</code><br/>Contacts & addresses masked.", table_cell),
            Paragraph("Read-only operational analytics. Cannot view victim/accused identities without break-glass verification.", table_cell)
        ],
        [
            Paragraph("<b>Command Mode</b><br/>(Verified Officer)", table_cell),
            Paragraph("<font color='#276749'><b>UNMASKED</b></font><br/>Full legal names, addresses, and accused profiles displayed.", table_cell),
            Paragraph("Requires dynamic 6-digit TOTP verification from Google/Microsoft Authenticator. <b>Auto-locks after 2.5 minutes of inactivity</b>.", table_cell)
        ],
        [
            Paragraph("<b>Audit Trail</b>", table_cell),
            Paragraph("Full immutable session log.", table_cell),
            Paragraph("Every unlock records: Officer KGID, Station, Timestamp, Event ID, and simulated ECDSA digital signature.", table_cell)
        ],
    ]
    t_sec = Table(sec_data, colWidths=[110, 194, 200])
    t_sec.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COL),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
    ]))
    story.append(t_sec)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>The Dynamic Per-Officer MFA Lifecycle (UserMFA Table):</b>", h2_style))
    story.append(Paragraph(
        "Unlike basic prototypes that use a single shared password or hardcoded secret, MADHUKAR AI assigns every individual officer a unique, "
        "cryptographically generated 160-bit Base32 TOTP secret.", body_style
    ))

    mfa_steps_text = (
        "1. <b>First-Time Onboarding:</b> Officer enters Badge (KGID) and Official Email. Backend generates a unique Base32 key, "
        "encrypts it via <b>AES-256-GCM</b> with an authentication tag, stores it in Catalyst DataStore (<code>UserMFA</code> table), "
        "and generates a high-resolution QR code (<code>otpauth://</code> URI). The officer scans this with Google Authenticator on their phone "
        "and enters their first 6-digit code to activate.<br/>"
        "2. <b>Subsequent Unlocks:</b> Backend checks <code>UserMFA</code>. If active, it skips the QR code and prompts directly for the 6-digit code. "
        "The server decrypts the officer's secret and performs mathematical RFC 6238 HMAC-SHA1 verification.<br/>"
        "3. <b>Self-Service Device Recovery (Lost Phone):</b> If an officer loses their phone, clicking <i>'Lost phone or cannot access Authenticator?'</i> "
        "generates a 6-digit verification code stored in <b>Catalyst Cache</b> (5-min TTL) and delivered via <b>Catalyst Mail</b> to their official email. "
        "Confirming the email code instantly revokes the compromised key and generates a fresh QR code."
    )
    story.append(Paragraph(mfa_steps_text, body_style))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # 6. FORENSIC SIMILARITY ENGINE & TAXONOMY RESOLVER
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("6. Forensic Intelligence Engines", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=10))

    story.append(Paragraph("6.1 Forensic Modus Operandi Similarity Engine (similarityEngine.js)", h2_style))
    story.append(Paragraph(
        "Detecting crime series requires comparing criminal behavior patterns across thousands of records. "
        "The Forensic Similarity Engine evaluates 6 distinct investigative signals to produce a normalized score from 0 to 100:", body_style
    ))

    sim_table = [
        [Paragraph("Investigative Signal", table_header), Paragraph("Weight", table_header), Paragraph("Forensic Scoring Logic", table_header)],
        [
            Paragraph("Shared Accused", table_cell),
            Paragraph("+30 pts", table_cell),
            Paragraph("Exact or alias match between named suspects across both FIRs.", table_cell)
        ],
        [
            Paragraph("Shared Crime Major Head", table_cell),
            Paragraph("+20 pts", table_cell),
            Paragraph("Both cases fall under identical primary legal head (e.g. Property Crime).", table_cell)
        ],
        [
            Paragraph("Shared Sub-Head", table_cell),
            Paragraph("+15 pts", table_cell),
            Paragraph("Specific offence alignment (e.g. Night House Burglary vs Chain Snatching).", table_cell)
        ],
        [
            Paragraph("Modus Operandi Keywords", table_cell),
            Paragraph("+15 pts", table_cell),
            Paragraph("NLP keyword extraction from BriefFacts (e.g. 'iron rod', 'broken lock', 'fake UPI').", table_cell)
        ],
        [
            Paragraph("Shared Police Station", table_cell),
            Paragraph("+10 pts", table_cell),
            Paragraph("Hyper-local geographical correlation (same station jurisdiction).", table_cell)
        ],
        [
            Paragraph("Shared District", table_cell),
            Paragraph("+10 pts", table_cell),
            Paragraph("Broader jurisdictional alignment across neighboring stations.", table_cell)
        ],
    ]
    t_sim = Table(sim_table, colWidths=[130, 74, 300])
    t_sim.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COL),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
    ]))
    story.append(t_sim)
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>The Cross-Category Safety Gate:</b>", h2_style))
    story.append(Paragraph(
        "A critical vulnerability in simple recommendation systems is false linkages — for example, linking a House Burglary to a Murder "
        "simply because both occurred in the same district on the same night. The Similarity Engine enforces an authoritative "
        "<b>Cross-Category Gate</b>: If Case A and Case B belong to fundamentally distinct categories (e.g. Property vs Body, or SC/ST vs Property), "
        "they are <b>strictly forbidden from linking</b> unless a verified named accused is physically present in both cases. "
        "Links are only published if the composite score reaches <b>60/100 or higher</b>.", body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("6.2 Crime Taxonomy & Classification Resolver (crimeTaxonomy.js)", h2_style))
    story.append(Paragraph(
        "In raw police databases, sub-head records frequently suffer from ambiguous categorization. "
        "<code>crimeTaxonomy.js</code> enforces strict resolution priority:<br/>"
        "1. <b>BriefFacts Keyword Detection:</b> Inspects FIR text for unambiguous terms (e.g., 'burglary', 'dowry', 'ganja').<br/>"
        "2. <b>Authoritative SUBHEAD_TO_HEAD_MAP:</b> 50-entry mapping binding every sub-head to its correct statutory Major Head.<br/>"
        "3. <b>Database Lookup Name:</b> Uses the relational join string if valid.<br/>"
        "4. <b>Numeric ID Map Fallback:</b> Maps numeric major IDs 1-10.<br/>"
        "5. <b>General Crime Fallback:</b> Eliminates 'Unknown' values entirely.", body_style
    ))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # 7. DEPLOYMENT & PRODUCTION ARCHITECTURE
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("7. Deployment, Hosting & Offline Resilience", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=10))

    story.append(Paragraph(
        "MADHUKAR AI is optimized for deployment on the <b>Zoho Catalyst Cloud</b> environment. "
        "It supports both cloud deployment and dual-mode offline execution to guarantee zero presentation risk.", body_style
    ))

    dep_data = [
        [Paragraph("Deployment Target", table_header), Paragraph("Deployment Command", table_header), Paragraph("Runtime Behavior", table_header)],
        [
            Paragraph("<b>Full Platform Deployment</b>", table_cell),
            Paragraph("<code>catalyst deploy</code>", code_style),
            Paragraph("Compiles React bundle to <code>build/</code> and deploys Express microservice to Catalyst Serverless.", table_cell)
        ],
        [
            Paragraph("<b>Frontend Only</b>", table_cell),
            Paragraph("<code>catalyst deploy --only client</code>", code_style),
            Paragraph("Uploads static SPA assets to Catalyst CDN under <code>/app/*</code>.", table_cell)
        ],
        [
            Paragraph("<b>Backend Only</b>", table_cell),
            Paragraph("<code>catalyst deploy --only functions</code>", code_style),
            Paragraph("Deploys <code>functions/crime_api</code> with all dependencies and config.", table_cell)
        ],
        [
            Paragraph("<b>Offline Demo Mode</b>", table_cell),
            Paragraph("<code>REACT_APP_DATA_SOURCE=sample<br/>npm start</code>", code_style),
            Paragraph("Zero network dependency. Runs 1,400+ synthetic cases with 60 FPS performance without Wi-Fi.", table_cell)
        ],
    ]
    t_dep = Table(dep_data, colWidths=[120, 160, 224])
    t_dep.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COL),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
    ]))
    story.append(t_dep)
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>Zero-Downtime Resilience Features:</b>", h2_style))
    resilience_text = (
        "• <b>In-Memory Fallback (localMfaProfiles):</b> If Catalyst DataStore encounters a transient network timeout or permission scope lock, "
        "the backend gracefully falls back to memory storage — allowing the officer to scan the QR code and unlock PII without 500 errors.<br/>"
        "• <b>SQL Datetime Normalization:</b> Automatically converts ISO dates (<code>.toISOString()</code>) to Catalyst's strict "
        "<code>YYYY-MM-DD HH:mm:ss</code> format, preventing <code>INVALID_INPUT</code> database rejections.<br/>"
        "• <b>Admin Elevation Scope:</b> The backend initializes Catalyst with <code>{ scope: 'admin' }</code>, ensuring API operations "
        "execute with Project Administrator privileges regardless of client authorization tokens."
    )
    story.append(Paragraph(resilience_text, body_style))
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    # 8. API ENDPOINT REFERENCE
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("8. REST API Reference (crime_api)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=10))

    api_endpoints = [
        [Paragraph("Method & Route", table_header), Paragraph("Description & Parameters", table_header), Paragraph("Output Schema", table_header)],
        [
            Paragraph("<code>GET /api/app-data</code>", code_style),
            Paragraph("Master dataset. Returns all 26 tables in a single cached payload.", table_cell),
            Paragraph("<code>{ _meta, CaseMaster:[], District:[], ... }</code>", code_style)
        ],
        [
            Paragraph("<code>GET /api/dashboard</code>", code_style),
            Paragraph("Computes statewide totals, monthly trends, and district charts.", table_cell),
            Paragraph("<code>{ totals, monthlyTrend, districtBreakdown }</code>", code_style)
        ],
        [
            Paragraph("<code>GET /api/cases</code>", code_style),
            Paragraph("Paginated case list with filter params (<code>districtId, crimeHeadId</code>).", table_cell),
            Paragraph("<code>{ cases:[], limit, offset }</code>", code_style)
        ],
        [
            Paragraph("<code>POST /api/copilot/chat</code>", code_style),
            Paragraph("Conversational AI query. Body: <code>{ message, history:[] }</code>.", table_cell),
            Paragraph("<code>{ reply, intent, toolsUsed:[] }</code>", code_style)
        ],
        [
            Paragraph("<code>GET /api/mfa/status</code>", code_style),
            Paragraph("Check officer MFA status. Params: <code>email, badgeId</code>.", table_cell),
            Paragraph("<code>{ status:'SETUP_REQUIRED'|'ENROLLED', qrDataUrl, secret }</code>", code_style)
        ],
        [
            Paragraph("<code>POST /api/mfa/verify</code>", code_style),
            Paragraph("Validate 6-digit Authenticator code. Body: <code>{ email, token }</code>.", table_cell),
            Paragraph("<code>{ success:true, verified:true }</code>", code_style)
        ],
        [
            Paragraph("<code>POST /api/mfa/request-reset</code>", code_style),
            Paragraph("Lost phone flow. Dispatches email verification OTP via Catalyst Mail.", table_cell),
            Paragraph("<code>{ success:true, emailSent:true }</code>", code_style)
        ],
        [
            Paragraph("<code>POST /api/mfa/confirm-reset</code>", code_style),
            Paragraph("Confirms email OTP, revokes old secret, issues new QR code.", table_cell),
            Paragraph("<code>{ success:true, qrDataUrl, secret }</code>", code_style)
        ],
    ]
    t_api = Table(api_endpoints, colWidths=[140, 194, 170])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COL),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
    ]))
    story.append(t_api)
    story.append(Spacer(1, 20))

    # Sign-off box
    signoff = [
        [Paragraph("<b>Document Status:</b> Approved for Presentation & Prototype Evaluation", table_cell),
         Paragraph("<b>Bangalore Finale:</b> Sept 18, 2026", table_cell)],
        [Paragraph("<b>Project:</b> KSP Crime Analytics & Intelligence Hub (MADHUKAR AI)", table_cell),
         Paragraph("<b>Repository:</b> Crime_Analytics_Dashboard-main", table_cell)]
    ]
    t_sign = Table(signoff, colWidths=[270, 234])
    t_sign.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COL),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_sign)

    # Build the document using NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF Successfully generated at: {filename}")


if __name__ == '__main__':
    output_path = r"D:\Datathon\Crime_Analytics_Dashboard-main\MADHUKAR_AI_Complete_Architecture_and_Workflow_Documentation.pdf"
    if len(sys.argv) > 1:
        output_path = sys.argv[1]
    build_pdf(output_path)
