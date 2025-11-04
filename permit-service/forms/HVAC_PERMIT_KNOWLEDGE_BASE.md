# HVAC Permit Knowledge Base for Tampa Bay Area
## AI Training Document for Permit Form Generation

This document provides comprehensive knowledge about HVAC permit requirements, forms, and fields for Tampa Bay (Hillsborough, Pinellas, and Pasco Counties).

---

## 1. COUNTY-SPECIFIC REQUIREMENTS

### Hillsborough County (Tampa, Brandon, Plant City)
**Portal**: HillsGovHub (https://hcfl.gov/HillsGovHub)
**Phone**: (813) 272-5600
**System**: Accela-based online permitting

**Key Requirements:**
- Notice of Commencement required when project cost >= $15,000
- A2L Refrigerant Pressure Test Affidavit required for new refrigerant types
- All applications submitted online via HillsGovHub
- No paper applications accepted

**Permit Types:**
- BLD-HVAC-RES-REPL: Residential HVAC Equipment Replacement (like-for-like)
- BLD-HVAC-RES-NEW: New Residential HVAC Installation
- BLD-MECH-DUCTWORK: Ductwork Modification or Installation
- BLD-HVAC-COM: Commercial HVAC Installation/Replacement

**Fee Structure:**
- Base permit fee: $50-$150 depending on equipment value
- Valuation-based: additional fees calculated on equipment/labor cost
- Expedited processing: +$100 (2-day review vs 5-7 days)

---

### Pinellas County (Clearwater, St. Petersburg, Safety Harbor)
**Portal**: Pinellas County Access Portal (https://aca-prod.accela.com/pinellas/)
**Phone**: (727) 464-3888
**System**: Accela-based online permitting

**Key Requirements:**
- Notice of Commencement required when project value >= $15,000
- Sub-Contractor Form required for multi-trade work
- Digital encrypted signature and seal on building plans
- Permit valid for 6 months from issue or last passed inspection

**Special Notes:**
- Florida Statute Chapter 489 requires permits for all AC installations/replacements
- Recorded NOC must be onsite for each inspection

---

### Pasco County (New Port Richey, Port Richey, Zephyrhills)
**Portal**: PascoGateway (https://aca-prod.accela.com/pasco/)
**Phone**: (727) 847-8126, option 5
**Email**: BCSCustomerService@MyPasco.net
**Office**: 8661 Citizens Dr. Suite 100, New Port Richey, FL 34654

**Key Requirements:**
- Same as other counties: NOC for projects >= $15,000
- Permit valid for 6 months from issue and 6 months from last inspection
- Multiple jurisdictions (County vs City of NPR vs City of Port Richey)

**Important**: Verify jurisdiction before applying - cities have separate processes

---

## 2. REQUIRED DOCUMENTS & FORMS

### A. Notice of Commencement (NOC)
**When Required**: Project cost >= $15,000 (HVAC-specific threshold)
**Must Be**: Recorded with county clerk AND posted on job site
**Timing**: Must be recorded within 90 days before work starts
**Expiration**: 1 year from recording date

**Form Fields:**
```
PROPERTY INFORMATION
- Legal description of property
- Street address
- City, State, ZIP
- Permit number
- Tax folio number

OWNER INFORMATION
- Owner name (must be property owner, not contractor)
- Owner mailing address
- Owner phone number
- Owner email

DESIGNATED PERSON IN FLORIDA (for service of notices)
- Name
- Address in Florida
- Phone number

LENDER INFORMATION (if applicable)
- Lender name
- Lender address
- Lender phone

SURETY/BONDING (if applicable)
- Payment bond amount
- Surety company name
- Surety phone and address

PROJECT INFORMATION
- Description of improvements (e.g., "HVAC replacement", "3-ton AC system installation")
- Construction/contract value ($)
- Expiration date (auto-calculated: 1 year from recording)

SIGNATURES
- Owner signature (ONLY owner may sign)
- Date
- Notary section (notarization required)
```

---

### B. Form R405-2020: Florida Residential Energy Efficiency Compliance
**When Required**: All new HVAC installations and major replacements
**Purpose**: Demonstrate compliance with Florida Energy Code
**Code Reference**: Florida Building Code, Energy Conservation Chapter

**Key Sections:**

#### 1. Project Information
- Project name
- Project address
- City, County, ZIP
- Permit number
- Owner name and contact
- Contractor name and license number
- Date of submission

#### 2. Building Information
- Building type (single-family, multi-family, townhouse)
- Number of stories
- Conditioned floor area (sq ft)
- Total floor area (sq ft)
- Number of bedrooms
- Ceiling height (feet)
- Year built (for replacements)
- Orientation (north-facing, etc.)

#### 3. Climate Zone
- Florida Climate Zone: Zone 1 or 2
- Design temperatures (cooling/heating)
- Design humidity levels

#### 4. HVAC System Information
- System type (split system, packaged unit, heat pump, mini-split)
- Cooling capacity (tons or BTU)
- Heating capacity (BTU)
- SEER rating (Seasonal Energy Efficiency Ratio)
- EER rating (Energy Efficiency Ratio)
- HSPF rating (Heating Seasonal Performance Factor - for heat pumps)
- AFUE rating (Annual Fuel Utilization Efficiency - for furnaces)
- AHRI Certificate Number (Air-Conditioning, Heating, and Refrigeration Institute)

#### 5. Equipment Details
- Outdoor unit manufacturer
- Outdoor unit model number
- Outdoor unit serial number
- Indoor unit (air handler/furnace) manufacturer
- Indoor unit model number
- Indoor unit serial number
- Refrigerant type (R-410A, R-32, R-454B, etc.)
- Thermostat type (programmable, smart, manual)

#### 6. Ductwork Information
- Duct system type (flex, rigid, combination)
- Duct insulation R-value
- Duct location (attic, crawlspace, conditioned space)
- Duct leakage test results (CFM25 or CFM50)
- Duct leakage compliance method (default, tested, sealed to conditioned space)

#### 7. Manual J Load Calculation Summary
- Design cooling load (BTU/hr)
- Design heating load (BTU/hr)
- Calculated sensible heat ratio
- Selected equipment capacity
- Equipment sizing compliance (must be within 115% of calculated load per Manual S)

#### 8. Energy Performance Level (EPL)
- EPL rating (calculated score)
- Compliance method (prescriptive or performance)
- Energy features summary

#### 9. Certifications
- Contractor certification signature
- HVAC technician certification signature
- License numbers
- Date of installation
- Date of inspection

---

### C. Manual J Load Calculation Report
**When Required**:
- All new installations
- Replacements where tonnage increases by more than 0.5 tons
- When changing from one system type to another (e.g., heat pump to AC+furnace)
- Any commercial installation

**What It Must Include:**
```
BUILDING ENVELOPE ANALYSIS
- Wall construction type and R-value
- Ceiling/attic insulation R-value
- Floor insulation (if applicable)
- Window types, U-factor, and SHGC (Solar Heat Gain Coefficient)
- Door types and U-factor
- Building orientation and shading
- Infiltration rate (ACH50 from blower door test, or estimated)

INTERNAL LOADS
- Number of occupants
- Appliances and equipment heat gain
- Lighting heat gain

CLIMATE DATA
- Design outdoor temperature (cooling and heating)
- Indoor design temperature setpoint
- Design humidity levels
- Elevation above sea level

ROOM-BY-ROOM LOAD CALCULATION
- Heating load per room (BTU/hr)
- Cooling load per room (BTU/hr)
- Total sensible cooling load
- Total latent cooling load
- Total heating load

EQUIPMENT SIZING RECOMMENDATION
- Recommended cooling capacity (tons or BTU)
- Recommended heating capacity (BTU)
- Equipment selection per ACCA Manual S (95-115% of calculated load)

SOFTWARE CERTIFICATION
- Software name and version used
- Calculation date
- Preparer name and credentials (if applicable)
```

---

### D. Equipment Specifications Sheet
**When Required**: Always (with permit application)
**Purpose**: Verify equipment meets code requirements

**Required Information:**
```
CONDENSING UNIT / OUTDOOR UNIT
- Manufacturer
- Model number
- Serial number
- Capacity (tons or BTU)
- SEER rating
- EER rating
- Refrigerant type
- Refrigerant charge amount (lbs)
- Voltage
- Amperage (MCA - Minimum Circuit Ampacity)
- MOCP (Maximum Overcurrent Protection - fuse/breaker size)
- AHRI Certificate Number

AIR HANDLER / FURNACE / INDOOR UNIT
- Manufacturer
- Model number
- Serial number
- Airflow rating (CFM)
- AHRI Certificate Number
- Voltage
- Amperage
- For furnaces: BTU input, BTU output, AFUE rating
- For heat pumps: HSPF rating

THERMOSTAT
- Type (manual, programmable, smart)
- Manufacturer and model
- Features (Wi-Fi, humidity control, etc.)

ADDITIONAL COMPONENTS (if applicable)
- UV lights: model and wattage
- Air purifiers: model and specifications
- Humidifier/dehumidifier: model and capacity
- Emergency heat strips: model and kW rating
```

---

### E. AHRI Certificate
**What**: Official certification that outdoor unit + indoor unit are a matched pair
**When Required**: All new installations and replacements
**Where to Get**: https://www.ahridirectory.org/

**Information on Certificate:**
- Outdoor unit model
- Indoor unit model
- Combination rating
- SEER rating
- EER rating
- Capacity (tons/BTU)
- AHRI Reference Number

**Why It Matters**:
- Mismatched systems void warranties
- Efficiency ratings only valid for certified combinations
- Required by Florida Building Code

---

### F. Site Plan / Plot Plan
**When Required**: New installations, ductwork additions, major modifications
**Scale**: Not to scale acceptable for most residential HVAC

**Must Show:**
```
PROPERTY BOUNDARIES
- Property lines
- Setbacks
- Easements

EXISTING STRUCTURES
- House footprint
- Garage, shed, or other structures
- Pool and pool equipment

HVAC EQUIPMENT LOCATIONS
- New outdoor unit location (distance from property lines and structures)
- Distance to windows, doors, and air intakes (minimum 3-5 feet per code)
- Access clearances (minimum 30" on service side, per manufacturer)
- Distance from electrical meters and gas lines

UTILITY LINES (if visible/known)
- Electrical service entrance
- Gas lines
- Water lines

DRAINAGE
- Direction of condensate drain discharge
- Distance to property lines (must be on owner's property)

MEASUREMENTS
- Distances from equipment to structures
- Distances from equipment to property lines
```

---

### G. Electrical Permit (if applicable)
**When Required**:
- New circuit installation
- Upgrading electrical panel
- Installing new disconnect switch
- Running new electrical conduit

**Usually NOT Required for**:
- Like-for-like replacements using existing circuit
- Same voltage and amperage requirements

---

### H. A2L Refrigerant Affidavit (Hillsborough County)
**When Required**: Using new A2L refrigerants (R-32, R-454B, R-452B)
**Purpose**: Confirm proper pressure testing and safety procedures

**Fields:**
- Permit number
- Property address
- Contractor name and license
- Refrigerant type used
- Pressure test results (psig and duration)
- Leak check certification
- Installation date
- Technician signature and EPA 608 certification number

---

## 3. HVAC PERMIT CLASSIFICATION LOGIC

### Residential Permit Categories

#### **Simple Replacement (Like-for-Like)**
**Code**: BLD-HVAC-RES-REPL
**Triggers**:
- Replacing existing system with same type
- Same or smaller tonnage (within 0.5 tons)
- Using existing ductwork
- Using existing electrical circuit
- Same refrigerant type (or compatible)

**Typical Requirements**:
- Basic permit application
- Equipment specifications
- AHRI certificate
- Contractor license
- NO plans typically required
- NO Manual J required (in most cases)

**Fee Range**: $50-$100
**Processing Time**: 1-3 business days

---

#### **New Installation or Major Replacement**
**Code**: BLD-HVAC-RES-NEW
**Triggers**:
- First-time AC installation
- Adding AC to a home that never had it
- Increasing tonnage by >0.5 tons
- Changing system type (e.g., package unit to split system)
- New construction

**Typical Requirements**:
- Full permit application
- Equipment specifications
- AHRI certificate
- Manual J load calculation
- Form R405-2020 energy compliance
- Site plan showing equipment location
- Electrical load calculation (if new circuit)
- Contractor license

**Fee Range**: $100-$200
**Processing Time**: 3-7 business days (up to 10 for complex)

---

#### **Ductwork Modification**
**Code**: BLD-MECH-DUCTWORK
**Triggers**:
- Adding new supply or return vents
- Extending ductwork to new rooms
- Replacing all ductwork
- Modifying duct system design

**Typical Requirements**:
- Ductwork layout/diagram
- Duct sizing calculations (Manual D)
- Insulation specifications
- Duct leakage test plan
- May require Manual J recalculation

**Fee Range**: $75-$150
**Processing Time**: 3-5 business days

---

#### **Repair / Service Work**
**Usually NO PERMIT REQUIRED**
**Examples**:
- Refrigerant recharge
- Compressor replacement (same unit)
- Fan motor replacement
- Coil cleaning
- Thermostat replacement
- Filter replacement
- Capacitor replacement

**When Permit IS Required**:
- Replacing entire outdoor unit
- Replacing entire indoor unit (air handler)
- Electrical work beyond simple connections
- Refrigerant line replacement >10 feet

---

### Commercial Permit Categories

#### **Commercial HVAC**
**Code**: BLD-HVAC-COM
**Triggers**:
- Any commercial building
- Multi-family (3+ units)
- Industrial
- Institutional
- Systems >5 tons

**Additional Requirements**:
- Engineered plans with PE stamp
- Mechanical load calculations
- Energy code compliance (ASHRAE 90.1)
- Fire/life safety integration
- Building automation system (if applicable)
- Commissioning plan

**Fee Range**: $200-$1,000+ (depends on project size)
**Processing Time**: 7-14 business days minimum

---

## 4. SPECIAL REQUIREMENTS & SCENARIOS

### Coastal Areas and Flood Zones

**Flood Zone Designations:**
- **Zone X**: Minimal flood risk, standard requirements
- **Zone A, AE**: Moderate to high flood risk, 100-year floodplain
- **Zone V, VE**: High-velocity coastal wave action areas

**Additional Requirements for Zones A, AE, V, VE:**
```
ELEVATION REQUIREMENTS
- Outdoor units must be elevated above Base Flood Elevation (BFE)
- Platform must be engineered and anchored
- Platform design must be sealed by Florida-licensed engineer
- Elevation certificate required (surveyor)

ANCHORING REQUIREMENTS
- Equipment must be anchored to resist flood forces
- Stainless steel or galvanized hardware
- Anchor design calculations required

ELECTRICAL
- Disconnects and electrical equipment must be elevated
- Must meet NEC 680 requirements for wet locations

DOCUMENTATION
- FEMA Elevation Certificate
- Engineer-sealed platform design
- Anchoring detail drawings
- Flood zone designation on permit
```

**Coastal Zip Codes (Likely Flood Zones):**
- 34xxx: Coastal Pasco/Hernando
- 337xx: Pinellas (Clearwater, St. Pete beaches)
- 338xx: Hillsborough (Tampa Bay shoreline)

---

### High-Wind Areas

**Florida Wind Zones:**
- **Zone 1**: Inland areas, 110-130 mph design wind speed
- **Zone 2**: Coastal areas, 130-160 mph design wind speed
- **Zone 3**: Extreme coastal (rare), 160+ mph

**Requirements:**
- Equipment must be rated for design wind speed
- Anchor bolts and tie-downs per manufacturer + Florida Building Code
- Stand or pad must be anchored to structure or ground with engineered design
- May require engineer-sealed anchorage details for Zone 2+

---

### Airport Proximity

**Height Restrictions:**
- Tampa International Airport: 5-mile radius restrictions
- St. Pete-Clearwater Airport: 3-mile radius restrictions
- Regional airports: varies

**Requirements:**
- If rooftop equipment, FAA Form 7460-1 may be required
- Usually not an issue for ground-level residential HVAC
- Commercial rooftop units may require FAA review

---

### Historic Districts

**Tampa:**
- Ybor City Historic District
- Hyde Park Historic District
- Seminole Heights Historic District

**Additional Requirements:**
- Historic Preservation Committee review
- Visual impact assessment
- Equipment screening/concealment may be required
- Architectural compatibility review

**Typical Requirements:**
- Photos of proposed equipment location
- Screening plan (fence, landscaping, architectural elements)
- Paint color matching (if visible)

---

### HOA / Condo Associations

**Not Building Department, but Important:**
- Review HOA covenants and restrictions
- May require HOA architectural approval BEFORE permit
- Equipment location restrictions
- Noise ordinance compliance
- Aesthetic requirements

---

## 5. PERMIT PROCESS WORKFLOW

### Step-by-Step Process

```
1. DETERMINE PERMIT TYPE
   ↓
2. GATHER REQUIRED DOCUMENTS
   - Equipment specs
   - AHRI certificate
   - Manual J (if required)
   - Form R405 (if required)
   - Site plan (if required)
   - NOC (if cost >= $15,000)
   ↓
3. SUBMIT APPLICATION ONLINE
   - HillsGovHub / Pinellas Portal / PascoGateway
   - Upload all documents
   - Pay fees
   ↓
4. PLAN REVIEW (if required)
   - Processing time: 1-10 business days
   - Review comments issued if corrections needed
   ↓
5. PERMIT ISSUED
   - Print permit
   - Post permit at job site
   ↓
6. PERFORM WORK
   - Work must match permitted plans
   - Contractor must be licensed
   ↓
7. REQUEST INSPECTIONS
   - Rough-in inspection (before closing walls/ceilings)
   - Final inspection
   ↓
8. PASS FINAL INSPECTION
   - Permit closed
   - Certificate of Completion issued
```

---

### Required Inspections

#### Rough-In Inspection (if ductwork or electrical)
**When**: Before insulation, drywall, or ceiling closure
**What Inspector Checks**:
- Ductwork properly sized and supported
- Proper insulation on ducts
- No duct leaks visible
- Electrical conduit and wiring properly installed
- Disconnects and shutoffs installed
- Condensate drain properly pitched and terminated
- Clearances maintained

#### Final Inspection
**When**: After all work complete, system operational
**What Inspector Checks**:
- Equipment matches permit
- Proper installation per manufacturer specs
- Nameplate visible and accessible
- Disconnect labeled
- Return air properly sized
- Air filter installed and accessible
- Thermostat installed and functioning
- System running, cooling/heating properly
- Refrigerant lines insulated
- Condensate drain terminating properly (not on neighbor's property!)
- Permit card posted

**Common Failures:**
- Missing or wrong equipment
- Insufficient clearances
- Improper condensate drain
- Electrical disconnects not labeled
- Return air too small
- Refrigerant lines not insulated
- System not running during inspection

---

## 6. EQUIPMENT TECHNICAL SPECIFICATIONS

### Minimum Efficiency Requirements (Florida Energy Code)

**Central Air Conditioners (Split Systems):**
- Minimum SEER: 15 (as of Jan 1, 2023)
- Minimum EER: 12.2

**Central Air Conditioners (Packaged Units):**
- Minimum SEER: 14
- Minimum EER: 11

**Heat Pumps (Split Systems):**
- Minimum SEER: 15
- Minimum HSPF: 8.8

**Heat Pumps (Packaged Units):**
- Minimum SEER: 14
- Minimum HSPF: 8.0

**Gas Furnaces:**
- Minimum AFUE: 80% (90% for northern climates, but FL typically 80%)

---

### Tonnage and BTU Conversions

**Standard Sizes:**
- 1.5 ton = 18,000 BTU
- 2.0 ton = 24,000 BTU
- 2.5 ton = 30,000 BTU
- 3.0 ton = 36,000 BTU
- 3.5 ton = 42,000 BTU
- 4.0 ton = 48,000 BTU
- 5.0 ton = 60,000 BTU

**Rule of Thumb (Florida climate):**
- 400-600 sq ft per ton (varies by insulation, windows, ceiling height)
- Coastal/full sun: 400 sq ft per ton
- Well-insulated/shaded: 600 sq ft per ton
- Manual J calculation required for accurate sizing

---

### Common Equipment Types

**Split System:**
- Outdoor condensing unit
- Indoor air handler or furnace
- Refrigerant lines connecting them
- Most common in Florida residential

**Package Unit:**
- All components in one outdoor cabinet
- Ductwork connects directly to unit
- Common in commercial, older homes, mobile homes

**Mini-Split (Ductless):**
- Outdoor condensing unit
- One or more indoor wall-mounted or ceiling-mounted units
- No ductwork required
- Popular for additions, older homes without ducts

**Heat Pump:**
- Provides both heating and cooling
- More efficient than electric strip heat
- Required backup heat (emergency heat strips)

---

### Refrigerant Types

**R-410A (Puron):**
- Current standard (being phased out)
- Higher pressure than older R-22
- Non-ozone depleting
- GWP: 2,088

**R-22 (Freon):**
- Phased out (no new equipment)
- Only available for repairs (expensive)
- Ozone-depleting

**A2L Refrigerants (New Standard, 2025+):**
- **R-32**: GWP 675, slightly flammable (A2L classification)
- **R-454B**: GWP 466, A2L classification
- **R-452B**: GWP 698, A2L classification
- Lower global warming potential
- Require special handling and pressure testing

---

## 7. AI PROMPT ENHANCEMENT GUIDELINES

### Key Information to Extract from Contractors

**Always Ask/Extract:**
1. Property address (get specific: street, city, ZIP)
2. Work type (replacement, new installation, repair)
3. Equipment type (central AC, heat pump, package unit, mini-split)
4. Tonnage or BTU capacity
5. Contractor name and license number
6. Property owner name and contact
7. Is this a permit for work already completed, or work to be done?

**Smart Follow-Up Questions Based on Answers:**
- If "replacement": Ask if tonnage is same or changing
- If "new installation": Ask if home currently has AC
- If coastal ZIP (337xx, 346xx): Ask about flood zone
- If tonnage >4 tons: Confirm it's residential, not commercial
- If cost likely >$15k: Mention Notice of Commencement requirement

**County Detection:**
```
Auto-detect county from city:
- Tampa, Brandon, Plant City → Hillsborough
- Clearwater, St. Petersburg, Safety Harbor, Largo → Pinellas
- New Port Richey, Port Richey, Zephyrhills, Dade City → Pasco
- If ZIP provided, validate against known ZIP ranges
```

**Flood Zone Detection:**
```
High-risk ZIPs (always ask about flood zone):
- 33701-33785 (Pinellas coastal)
- 33755, 33767 (Clearwater Beach area)
- 34652, 34668 (Pasco coastal)
- 33602, 33609, 33611 (Tampa coastal areas)
```

**Permit Classification Logic:**
```
IF job_type == "replacement" AND tonnage_change <= 0.5 AND same_system_type:
    → Simple replacement (BLD-HVAC-RES-REPL)
    → Requirements: basic permit, equipment specs, AHRI cert
    → No Manual J required
    → Fee: ~$50-100, 1-3 days

ELSE IF job_type == "replacement" AND (tonnage_change > 0.5 OR different_system_type):
    → New installation category (BLD-HVAC-RES-NEW)
    → Requirements: full permit, Manual J, Form R405, site plan
    → Fee: ~$100-200, 3-7 days

ELSE IF job_type == "new installation":
    → New installation (BLD-HVAC-RES-NEW)
    → Requirements: full permit, Manual J, Form R405, site plan
    → Fee: ~$100-200, 3-7 days

ELSE IF job_type == "ductwork only":
    → Ductwork permit (BLD-MECH-DUCTWORK)
    → Requirements: duct layout, Manual D
    → Fee: ~$75-150, 3-5 days

ELSE IF equipment_size > 5_tons OR property_type == "commercial":
    → Commercial permit (BLD-HVAC-COM)
    → Requirements: engineered plans, PE stamp
    → Fee: $200+, 7-14 days
```

---

### Conversational Intelligence Tips

**Parse "Info Dumps" Effectively:**
Contractors often provide a lot of info at once. Extract ALL of it before asking more.

Example user message:
> "I need a permit for 123 Main St Tampa, it's a 3-ton Trane XR14 replacing an old 2.5-ton Rheem, owner is John Smith 813-555-1234, I'm ABC Cooling license CAC1234567"

**Good AI Response:**
> "Got it! Let me confirm what you've provided:
>
> ✓ Address: 123 Main St, Tampa (Hillsborough County)
> ✓ Work type: Replacement (2.5-ton → 3-ton, slight increase)
> ✓ New equipment: Trane XR14, 3-ton
> ✓ Owner: John Smith, (813) 555-1234
> ✓ Contractor: ABC Cooling, License CAC1234567
>
> Since you're increasing tonnage by 0.5 tons, this will likely require a Manual J load calculation and Form R405 energy compliance. Do you have a Manual J for this home already, or will you need to perform one?"

**Bad AI Response:**
> "Thanks! What's the property address?"
(Ignoring that it was already provided)

---

### Common Abbreviations Contractors Use

**Equipment:**
- AC = Air conditioner
- HP = Heat pump
- AHU = Air handler unit
- RTU = Rooftop unit
- Split = Split system
- PKG = Package unit
- Mini-split = Ductless system

**Work Types:**
- Changeout = Replacement
- New install = New installation
- R&R = Remove and replace (replacement)
- Upsize = Increase tonnage
- Downsize = Decrease tonnage

**Components:**
- Condenser = Outdoor unit
- Evap coil = Evaporator coil (indoor)
- TXV = Thermostatic expansion valve
- Lineset = Refrigerant lines

---

### Estimated Timelines to Communicate

**Simple Replacement:**
- Permit processing: 1-3 business days
- Inspection scheduling: Same day or next day
- Total timeline: 3-5 days from application to completion

**New Installation:**
- Permit processing: 3-7 business days (10+ if corrections needed)
- Plan review: May require 1-2 rounds of revisions
- Inspection scheduling: 1-2 days
- Total timeline: 1-2 weeks from application to completion

**Commercial:**
- Permit processing: 7-14 business days minimum
- Plan review: Often 2-3 rounds of revisions
- Multiple inspections required
- Total timeline: 3-6 weeks

---

## 8. QUALITY ASSURANCE CHECKLIST

Before generating any permit application, verify:

**✓ Complete Address:**
- Street number and name
- City
- ZIP code
- County (auto-detected and confirmed)

**✓ Property Owner Information:**
- Full legal name (as it appears on property deed)
- Phone number
- Email address (if available)

**✓ Contractor Information:**
- Company name
- Contractor name
- License number (format: CAC1234567, CFC1234567, etc.)
- Phone number
- Email address

**✓ Equipment Specifications:**
- Manufacturer
- Model number
- Tonnage or BTU capacity
- SEER rating
- System type (split, package, heat pump, etc.)

**✓ Work Description:**
- Clear description of work (replacement, new installation, repair)
- Existing equipment details (if replacement)
- New equipment details

**✓ Special Conditions Identified:**
- Flood zone status (if coastal)
- Historic district (if applicable)
- HOA requirements (mention if likely)
- Notice of Commencement (if cost >= $15k)

**✓ Estimated Costs:**
- Equipment cost
- Labor cost
- Total project cost
- Identify if >= $15k for NOC requirement

---

## 9. COMMON ERRORS TO AVOID

**Don't:**
- Assume a city without verifying county (e.g., "Temple Terrace" could be Hillsborough)
- Skip flood zone questions for coastal properties
- Forget to ask about existing equipment for replacements
- Provide generic equipment specs - always get model numbers
- Quote fees without considering project complexity
- Forget to mention inspection requirements

**Do:**
- Confirm county even if city is provided
- Ask about increasing tonnage for replacements
- Mention Manual J requirements proactively
- Explain inspection process
- Set realistic timeline expectations
- Warn about common permit failures

---

## 10. EXAMPLE FORM FIELD MAPPINGS

### For Permit Application Portal:

**Section 1: Property Information**
```
Field: "Property Address" → Extract from: user's address input
Field: "City" → Extract from: user's city OR infer from county
Field: "ZIP Code" → Extract from: user's ZIP
Field: "County" → Auto-detect: Hillsborough, Pinellas, or Pasco
Field: "Parcel ID" → Ask owner or mark "Unknown" (portal can look up)
Field: "Subdivision" → Ask if known, otherwise "N/A"
```

**Section 2: Applicant Information**
```
Field: "Applicant Type" → Always "Contractor"
Field: "Company Name" → Extract from: contractor's company name
Field: "License Number" → Extract from: contractor's license
Field: "Phone" → Extract from: contractor's phone
Field: "Email" → Extract from: contractor's email
```

**Section 3: Owner Information**
```
Field: "Owner Name" → Extract from: property owner name
Field: "Owner Phone" → Extract from: owner's phone
Field: "Owner Email" → Extract from: owner's email (or mark optional)
Field: "Owner Address" → Same as property address (unless owner lives elsewhere)
```

**Section 4: Project Information**
```
Field: "Work Description" → Generate from: job type + equipment details
Example: "Replace existing 2.5-ton AC system with new 3-ton Trane XR14 split system (SEER 16). Like-for-like replacement using existing ductwork and electrical."

Field: "Estimated Cost" → Sum of equipment + labor
Field: "Start Date" → Ask contractor or default to "TBD"
Field: "Completion Date" → Calculate: start date + 1-3 days for residential
```

**Section 5: Equipment Details**
```
Field: "Equipment Type" → Extract: "Central AC", "Heat Pump", "Package Unit", etc.
Field: "Manufacturer" → Extract from: contractor's equipment specs
Field: "Model Number" → Extract from: contractor's equipment specs
Field: "Capacity" → Extract: tonnage or BTU
Field: "SEER" → Extract from: contractor's specs or equipment model lookup
```

---

## 11. RESOURCES & REFERENCES

**Official County Portals:**
- Hillsborough: https://hcfl.gov/HillsGovHub | (813) 272-5600
- Pinellas: https://aca-prod.accela.com/pinellas/ | (727) 464-3888
- Pasco: https://aca-prod.accela.com/pasco/ | (727) 847-8126

**Forms:**
- Notice of Commencement: Available on each county's portal
- Form R405-2020: https://www.floridabuilding.org/fbc/committees/energy/energy_forms/

**Codes & Standards:**
- Florida Building Code: https://www.floridabuilding.org/
- ACCA Manual J: Load calculation standard
- ACCA Manual S: Equipment selection standard
- ACCA Manual D: Duct design standard
- AHRI Directory: https://www.ahridirectory.org/ (equipment ratings)

**License Verification:**
- Florida DBPR: https://www.myfloridalicense.com/

---

**Document Version**: 1.0
**Last Updated**: October 2025
**AI Training Purpose**: This document is designed to train AI agents to assist HVAC contractors with Tampa Bay permit applications

