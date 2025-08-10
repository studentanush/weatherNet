# 🌞 Weather-Net(solar enery prediction)

This project builds a deep learning model to forecast hourly solar energy output (W/m²) using weather features from NASA's POWER API. It includes a `FastAPI` server for making real-time predictions using geographic coordinates.

---

## 📦 Features

* Predict next hour’s solar irradiance (ALLSKY\_SFC\_SW\_DWN)
* Uses historical hourly weather data (past 24h)
* FastAPI endpoint for real-time predictions
* Model built using Transformer-based architecture (`TimeSeriesTransformer`)

---

## 🧠 Model Architecture

* Input: 24 hourly sequences of 14 weather features
* Model: Transformer encoder
* Output: Next hour solar energy prediction (in W/m²)

---
## 📷 Images
* Actual Vs Predicted
  <img title="a title" alt="Alt text" src="images\WhatsApp Image 2025-08-09 at 21.12.36_66499ea0.jpg">
* Average Hourly Solar Prediction
  <img title="a title" alt="Alt text" src="images\average_hourly_solar_energy_data.png">
* On Live data never seem before
  <img title="a title" alt="Alt text" src="models\last7days_comparison.png">

---
## 🚇Metric

* RMSE Error = 24.0718

* MSE Error  = 15.7112
---
## 📁 Project Structure



```
.
├── app.py                # FastAPI app for live prediction
├── model.py              # Transformer model class
├── fetch.py              # Data fetcher using NASA POWER API
├── scalers/
│   └── feature_scaler.pkl  # Saved StandardScaler
├── models/
│   └── version2.pth        # Trained PyTorch model
├── requirements.txt
└── README.md
```

---

## 🚀 Running the API Server

1. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

2. **Start FastAPI server**:

   ```bash
   uvicorn app:app --reload
   ```

3. **Test API in browser**:
   Open: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📥 API Usage

### Endpoint

```
POST /predict
```

### Input JSON:

```json
{
  "location": "Pune",
  "latitude": 18.52,
  "longitude": 73.85
}
```

### Response:

```json
{
  "location": "Pune",
  "prediction_wm2": 302.17,
  "predicted_for": "2025-08-02 14:00:00"
}
```

---

## 🛰️ Data Source

* [NASA POWER API](https://power.larc.nasa.gov/)
* Features used:

  * `ALLSKY_SFC_SW_DIFF`, `ALLSKY_SFC_SW_DNI`, `TOA_SW_DWN`
  * `RH2M`, `QV2M`, `PS`, `WS2M`, `CLOUD_AMT`
  * `ALLSKY_SFC_LW_DWN`, `T2M`, `ALLSKY_SFC_SW_DWN`

---

## 🛠 Tech Stack

* **Language**: Python 3.10+
* **Framework**: FastAPI, PyTorch
* **Data Fetching**: NASA POWER API
* **Model**: Transformer-based sequence model

---

## 📈 Sample Prediction

```
Location: Delhi
🕒 Input: 2025-08-01 13:00 → 2025-08-02 12:00
🔮 Predicting: 2025-08-02 13:00
⚡ Output: 378.65 W/m²
```

---

## 📄 License

MIT License © 2025

---

