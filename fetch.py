import requests
import pandas as pd
from datetime import datetime, timedelta
import os

# --- Date Range for 24 hours from 4 days ago ---
def get_past_24hr_range(days_ago=4):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_ago)
    end_date = start_date + timedelta(days=2)
    return start_date.strftime('%Y%m%d'), end_date.strftime('%Y%m%d')

# --- Build NASA POWER API URL ---
def build_url(parameter, latitude, longitude, start_date, end_date):
    base_url = "https://power.larc.nasa.gov/api/temporal/hourly/point"
    query = (
        f"?parameters={parameter}"
        f"&community=RE"
        f"&latitude={latitude}&longitude={longitude}"
        f"&start={start_date}&end={end_date}"
        "&format=JSON"
    )
    return base_url + query

# --- Fetch API response ---
def fetch_data(parameter, latitude, longitude, days_ago=4):
    start_date, end_date = get_past_24hr_range(days_ago)
    url = build_url(parameter, latitude, longitude, start_date, end_date)
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"❌ Failed to fetch data: {response.status_code} - {response.text}")
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
    os.makedirs("dataset", exist_ok=True)
    filename = f"dataset/{location_name.lower()}_{parameter}_past24h.csv"
    df.to_csv(filename, index=False)
    print(f"✅ Saved: {filename}")
    return filename

# --- Orchestrator Function ---
def fetch_and_save(parameter, latitude, longitude, location_name, days_ago=4):
    print(f"🔍 Fetching {parameter} from {days_ago} days ago for {location_name}")
    json_data = fetch_data(parameter, latitude, longitude, days_ago)
    df = parse_data(json_data, parameter)
    csv_path = save_to_csv(df, parameter, location_name)
    return df, csv_path

def fetch_and_return(parameter, latitude, longitude, location_name, days_ago=4):
    json_data = fetch_data(parameter, latitude, longitude, days_ago)
    df = parse_data(json_data, parameter)
    csv_path = ""
    return df, csv_path
# --- Example Usage ---
if __name__ == "__main__":
    fetch_and_return(
        parameter="ALLSKY_SFC_SW_DWN",  # Global solar radiation (W/m^2)
        latitude=18.5204,               # Pune latitude
        longitude=73.8567,              # Pune longitude
        location_name="Pune",
        days_ago=4
    )
