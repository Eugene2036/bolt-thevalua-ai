export function useImage(imageId: string | undefined) {
  if (!imageId) {
    return undefined;
  }
  return `${imageId}?token=AAPKd8d50e1ebe9340be9646d306e625a2b7WZDHriMtDiM28nkiNuH5G5hmk0xQ_z-fu9EjZVTSli6YU6EBussmrORSn2yKBSZn`;
}
