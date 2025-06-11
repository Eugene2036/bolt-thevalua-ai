# DATA MODEL FOR EACH PROPERTY ACCOUNT

## TENANTS

-Name
-Term of lease

-Start Date
-End Date
* Rem months (end date - date of analysis)

-Gross monthly rental
-escl %
-type (Consulting rm, factory, flats, office, shop, showroom, store, terrace, warehouse, workshop, other)

-area per client
*gross rate per m2 per client (gross monthly rental / area)
*% GLA per client (Area / Total area per client for all tenants)
*Actual gross rental per client (area per client * gross rate per m2 per client)
  
-area per market
-gross rate per m2 per valuer
*%GLA per valuer (Area / Total area per market for all tenants)
*gross rental per market per valuer (area per market * gross rate per m2 per valuer)

## PARKING
-type (basement, covered, open, shade, other) per client
-unit per client
-rate per client
*total (unit * rate) per client

-unit per market
-rate per market
*total (unit * rate) per market

## OUTGOINGS
-item per client
-base per client
-rate per client
*outgoings (base * rate) per client

-item per market
-base per market
-rate per market
*outgoings (base * rate) per market

## CAPITALISED VALUE OF INCOME
  [PER CLIENT, PER VALUER]
    *Gross annual rental income (Annual gross)
    -vacancies percentage
    *vacancies (gross annual rental income * vacancies percentage)
    *recoveries (total area per client * 'some recovery value' * 12) * (1-vacancies percentage) ???

    *net annual rental income (gross annual rental income - annual outgoings - vacancies + recoveries)
    *ratio of outgoings to gross income (annual outgoings/gross annual rental income)

    -capitalisation rate
    *capitalised value -> round(net annual rental income / capitalisation rate, -5)

## DISCOUNTED CASH FLOW
  -Net Annual Escalation %
  *Net Annual Income 
    *[Year 1] (Net Annual Rental Income Per Market)
    *[Year 2-6] (Previous Year Value * (1 + Net Annual Escalation))
  -Discount rate %
  -Year 6 capitalised in perpetuity @ %
  *PV 
    *[Year 1-6] (Net Annual Income For That Year * (1/(1+Discount Rate)^Yr))
  *MV (Sum of PVs for all 6 years)

## INSURANCE
-Item (Shops (Gotta have roof type) or other (AC, Lifts, Paving, Wailing, Sec System, Remote gates & door, Basement parking)) ???
-Roof Type? (Fibre Cement, Concrete, Iron/Aluminium - Flat, Iron/Aluminium - Pitched, IBR - Flat, IBR - Pitched, Shingles(Timber), Slate, Thatch, Tiles, Treated Thatch, Other)
* Area (Total area per client for lettable space)
-Rate
*Cost (Conventional) (Area * Rate but only if 04 is not thatch ???)
*Cost (Thatch) (Area * Rate but only if 04 is thatch ???)

### INSURANCE FIXED VALUES
[Conventional, Thatch]
  *Subtotal for cost
  -Vat %
  *Vat (Subtotal * Vat %)
  *Com property for S/T (20% of Subtotal) only if Valuations E1 is set ???
  *Prof fees & demolition 15% of (Subtotal + Vat + Com property)
  *Replacement cost at inception date (Subtotal + Vat + Com property, Prof fees)
  -Pre tender escalation
    -@
    -%
    *Value (@ * %/12 * Replacement cost)
  -Post tender escalation
    -@
    -%
    *Value (@ * %/12 * Subtotal)
  *Total round(Replacement cost + Pre + Post tender escalation, -6)

## SUMMARY
-Valuer
-Valuation date
-Plot description
-Plot extent m2
-Physical Address
-Zoning
-Property Classification
-Usage
*GLA m2 (Total area per client for lettable space)
*Gross Annual Income (Annual gross income per market (Analysis of Income))
*Net Annual Income (Net Annucal Income per market (Analysis of Income))
*Annual expenditure (Annual outgoings per market)
*Operating costs per month (Outgoings per rentable m2/month per market)
*Annual expenditure as % (ratio of outgoings to gross income)
*Capitalisation rate (same value per market in analysis) i67 analysis
*Vacancy rate (vacancies per market) i62 analysis
*Market value (capitalised value per market) k68 analysis
*Force sale value round(90% of market value, -6)
*Rate per m2 based on MV (GLA) (capitalised value rate per m2 per market) j68 analysis
*Total replacement value (total conventional insurance) g32 insurance 