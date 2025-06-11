## Valua

Valuations (Analysis of leases)
  * Analysis date
  -Area
  -Term of lease
  -Tenant
  -Start Date
  -End Date
  * Rem months (end date - date of analysis)
  -Gross monthly rental
  *rate, m2 (gross monthly rental / area)
  -escl %

  *capitalised value of income
    per client (capitalised value per client)
    per market (capitalised value per market)

Income & Outgoings (Lettable space) (Additional details for tenants in valuations)
  -tenant 
  -type (Consulting rm, factory, flats, office, shop, showroom, store, terrace, warehouse, workshop, other)
  PER CLIENT
    -area per client
    -gross rate, m2
    -% GLA
    -Actual gross rental
  PER VALUER
    -area per market
    -gross rate, m2
    -%GLA
    -gross rental per market
Parking
  [PER CLIENT, PER VALUER]
    -type (basement, covered, open, shade, other)
    -unit
    -rate
    -total (unit * rate)

[PER CLIENT, PER VALUER]
  Monthly gross (total actual gross rentals + total parking)
  Annual gross (monthly gross * 12)

Outgoings
  [PER CLIENT, PER VALUER]
    -item
    -base
    -rate
    -outgoings per client (base, rate)

  Outgoings per rentable m2 per month per client (total outgoings / total area per client)
  Outgoings per rentable m2 per month per market (total outgoings / total area per market)

Capitalised value of income
  [PER CLIENT, PER VALUER]
    -Gross annual rental income (Annual gross)
    -vacancies percentage
    -vacancies (gross annual rental income * vacancies percentage)
    -recoveries (total area per client * 'some recovery value' * 12) * (1-vacancies percentage)

    -net annual rental income (gross annual rental income - annual gross - vacancies)
    -ratio of outgoings to gross income (annual outgoings/gross annual rental income)

    -capitalisation rate
    -capitalised value -> round(net annual rental income / capitalisation rate, -5)

Discounted Cash Flow
  -Net Annual Escalation
  -Net Annual Income 
    [Year 1] (Net Annual Rental Income)
    [Year 2-6] (Previous Year Value * (1 + Net Annual Escalation))
  -Discount rate
  -Year 6 capitalised in perpetuity @
  -PV 
    [Year 1-6] (Net Annual Income For That Year * (1/(1+Discount Rate)^Yr))
  -MV (Sum of PVs for all 6 years)

Serviceability ???

Insurance
-Item (Shops (Gotta have root type) or other (AC, Lifts, Paving, Wailing, Sec System, Remote gates & door, Basement parking)) ???
-Roof Type? (Fibre Cement, Concrete, Iron/Aluminium - Flat, Iron/Aluminium - Pitched, IBR - Flat, IBR - Pitched, Shingles(Timber), Slate, Thatch, Tiles, Treated Thatch, Other)
-Area (Total area per client for lettable space)
-Rate
-Cost (Conventional) (Area * Rate but only if 04 is not thatch ???)
-Cost (Thatch) (Area * Rate but only if 04 is thatch ???)

[Conventional, Thatch]
  -Subtotal for cost
  -Vat %
  -Vat (Subtotal * Vat %)
  -Com property for S/T (20% of Subtotal) only if Valuations E1 is set ???
  -Prof fees & demolition 15% of (Subtotal + Vat + Com property)
  -Replacement cost at inception date (Subtotal + Vat + Com property, Prof fees)
  -Pre tender escalation
    -@
    -%
    -Value (@ * %/12 * Replacement cost)
  -Post tender escalation
    -@
    -%
    -Value (@ * %/12 * Subtotal)
  -Total round(Replacement cost + Pre + Post tender escalation, -6)
  
-Grand total recommended Ceiling(Convetional total + Thatch total, 5000)

Summary
-Valuer
-Valuation date
-Plot description
-Plot extent m2
-Physical Address
-Zoning
-Property Classification
-Usage
-GLA m2 (Total area per client for lettable space)
-Gross Annual Income (Annual gross income per market (Analysis of Income))
-Net Annual Income (Net Annucal Income per market (Analysis of Income))
-Annual expenditure (Annual outgoings per market)
-Operating costs per month (Outgoings per rentable m2/month per market)
-Annual expenditure as % (ratio of outgoings to gross income)
-Capitalisation rate (same value per market in analysis) i67 analysis
-Vacancy rate (vacancies per market) i62 analysis
-Market value (capitalised value per market) k68 analysis
-Force sale value round(90% of market value, -6)
-Rate per m2 based on MV (GLA) (capitalised value rate per m2 per market) j68 analysis
-Total replacement value (total conventional insurance) g32 insurance 

--------------------------------------------------------------------------------------------------------------------------------

MUITI-RES SINGLE STOREY CONSTRUCTION COST CALCULATOR - UP-TO 500M2

ROW
- ref
- element

- first yr range
- second yr range
- third yr range

- property options ???
- construction estimate (TYPICAL)
  FOUNDATIONS
    if yr_of_dev === third_yr_range
      return property_floor_area * 2010-2013 (third _yr_range) figure???
    if yr_of_dev === second_yr_range
      return property_floor_area * second_yr_range
    if yr_of_dev === third_yr_range
      return property_floor_area * third_yr_range
    else
      return -2
  CONCRETE (RING BEAMS, COLUMNS, SLABS)
    if property_options !== YES
      return 0
    if yr_of_dev === third_yr_range
      return (third_yr_range_yes_value * property_floor_area)
    if yr_of_dev === second_yr_range
      return (second_yr_range_yes_value * property_floor_area)
    if yr_of_dev === third_yr_range
      return (third_yr_range_yes_value * property_floor_area)
    else
      return 0
  BRICKWORK
    STOCK BRICKS
      if yr_of_dev === third_yr_range
        return stock_brick_yr_range_value * yr???
      if yr_of_dev === second_yr_range
        return stock_brick_yr_range_value * property_floor_area
      if yr_of_dev === first_yr_range
        return stock_brick_yr_range_value * property_floor_area
      else
        return 0
    BLOCKS
      SAME
    FACE BRICKS
      SAME
    else
      return 0
  ROOFING
  TRUSSES
  FLOORING

yr_range_values
- identifier (yes/no, bricks, trusses, ...)
bricks (STOCK BRICKS, BLOCKS, FACE BRICKS, NO BRICKWORK DONE)
trusses (TIMBER ROOF TRUSSES, STRUCTURAL STEEL TRUSSES, NO ROOF TRUSSES)
roofing (CONCRETE ROOF TILES, IBR, CORRUGATED ROOFING SHEETS, NO ROOFING)
flooring (VINYL, TILING, TIMBER, CARPETS, NO FLOORING)
frames (STEEL WINDOW, ALUMINIUM WINDOW, NO WINDOWS FITTED)

QUALITY OF FINISHES
quality of finishes (LOW, GOOD, AVERAGE, HIGH)
construction estimate
  if high -> typical estimate * 1.2
  if average => typical estimate * 1
  if good -> typical estimate * 0.85
  if low -> typical estimate * 0.7
  
total building estimate (TYPICAL & QUALITY OF FINISHES) (total of construction estimates)
cost/m2 (TYPICAL & QUALITY OF FINISHES) (total building estimate / property floor area)

SCHEMA

CONSTRUCTION PROPERTY
- element
- property options
- typical construction estimate
- quality of finishes
- quality construction estimate

YEAR RANGE VALUES
- range
- identifier
- value