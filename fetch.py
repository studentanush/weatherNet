import requests
import pandas as pd
from datetime import datetime, timedelta
def get_date_range():
    end_date = datetime.today()
    start_date = end_date - timedelta(days=365)
    return start_date.strftime('%Y%m%d'), end_date.strftime('%Y%m%d')

def build_url(parameter, latitude, longitude, start_date, end_date):
    base_url = "https://power.larc.nasa.gov/api/temporal/hourly/point"
    query = (
        f"?parameters={parameter}"
        f"&community=RE"
        f"&latitude={latitude}&longitude={longitude}"
        f"&start={start_date}&end={end_date}"
        "&format=JSON"
    )
    print(base_url)
    return base_url + query

# --- Fetch API response ---
def fetch_data(parameter, latitude, longitude):
    start_date, end_date = get_date_range()
    url = build_url(parameter, latitude, longitude, start_date, end_date)
    
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch data: {response.status_code}")
    return response.json()

# --- Convert JSON response to DataFrame ---
def parse_data(json_data, parameter):
    records = json_data['properties']['parameter'][parameter]
    timestamps = list(records.keys())
    values = list(records.values())
    df = pd.DataFrame({
        'datetime': pd.to_datetime(timestamps, format="%Y%m%d%H"),
        parameter: values
    })
    return df

# --- Save DataFrame to CSV ---
def save_to_csv(df, parameter, location_name):
    filename = f"dataset/{location_name.lower()}_{parameter}_hourly.csv"
    df.to_csv(filename, index=False)
    print(f"✅ Saved: {filename}")

# --- Orchestrator Function ---
def fetch_and_save(parameter, latitude, longitude, location_name):
    print(f"🔍 Fetching {parameter} for {location_name}")
    json_data = fetch_data(parameter, latitude, longitude)
    df = parse_data(json_data, parameter)
    save_to_csv(df, parameter, location_name)

# --- Example Usage for Pune ---
if __name__ == "__main__":
    fetch_and_save(
        parameter="ALLSKY_SFC_SW_DWN",
        latitude=18.5204,
        longitude=73.8567,
        location_name="Pune"
    )
