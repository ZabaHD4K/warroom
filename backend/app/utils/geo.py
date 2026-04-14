from geoalchemy2 import WKTElement


def make_point(longitude: float, latitude: float) -> WKTElement:
    return WKTElement(f"POINT({longitude} {latitude})", srid=4326)


def parse_bbox(bbox: str) -> tuple[float, float, float, float]:
    """Parse 'min_lon,min_lat,max_lon,max_lat' into a tuple."""
    parts = [float(x.strip()) for x in bbox.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox must have exactly 4 values: min_lon,min_lat,max_lon,max_lat")
    return parts[0], parts[1], parts[2], parts[3]
