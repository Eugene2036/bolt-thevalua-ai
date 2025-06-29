export enum RoofType {
  FibreCement = 'Fibre Cement',
  Concrete = 'Concrete',
  IronOrAluminiumFlat = 'Iron/Aluminium - Flat',
  IronOrAluminiumPitched = 'Iron/Aluminium - Pitched',
  IBRFlat = 'IBR - Flat',
  IBRPitched = 'IBR - Pitched',
  Shingles_Timber = 'Shingles(Timber)',
  Slate = 'Slate',
  Thatch = 'Thatch',
  Tiles = 'Tiles',
  TreatedThatch = 'Treated Thatch',
  Other = 'Other',
}

export const ROOF_TYPES = [
  RoofType.FibreCement,
  RoofType.Concrete,
  RoofType.IronOrAluminiumFlat,
  RoofType.IronOrAluminiumPitched,
  RoofType.IBRFlat,
  RoofType.IBRPitched,
  RoofType.Shingles_Timber,
  RoofType.Slate,
  RoofType.Thatch,
  RoofType.Tiles,
  RoofType.TreatedThatch,
  RoofType.Other,
] as const;

export enum InsuranceItem {
  Shop = 'Shop',
  Warehouse = 'Warehouse',
  Office = 'Office',
  Paving = 'Paving',
  Lifts = 'Lifts',
  Escalators = 'Escalators',
  AC = 'AC',
  BasementParking = 'Basement parking',
  RemoteGatesAndDoor = 'Remote gates & door',
  Wailing = 'Wailing',

  Factory = 'Factory',
  Flat = 'Flat',
  Showroom = 'Showroom',
  Storeroom = 'Storeroom',
  Terrace = 'Terrace',
  Workshop = 'Workshop',
  Retail = 'Retail',
  Shed = 'Shed',
  Other = 'Other',
  BoundaryWall = 'Boundary Wall',
}

export const INSURANCE_ITEMS = [
  InsuranceItem.Shop,
  InsuranceItem.Warehouse,
  InsuranceItem.Office,
  InsuranceItem.Paving,
  InsuranceItem.Lifts,
  InsuranceItem.Escalators,
  InsuranceItem.AC,
  InsuranceItem.BasementParking,
  InsuranceItem.RemoteGatesAndDoor,
  InsuranceItem.Wailing,
  InsuranceItem.Factory,
  InsuranceItem.Flat,
  InsuranceItem.Showroom,
  InsuranceItem.Storeroom,
  InsuranceItem.Terrace,
  InsuranceItem.Workshop,
  InsuranceItem.Retail,
  InsuranceItem.Shed,
  InsuranceItem.Other,
  InsuranceItem.BoundaryWall,
] as const;

export const ROOFLESS = [
  InsuranceItem.AC,
  InsuranceItem.Paving,
  InsuranceItem.BasementParking,
  InsuranceItem.Lifts,
  InsuranceItem.Escalators,
  InsuranceItem.RemoteGatesAndDoor,
] as const;
