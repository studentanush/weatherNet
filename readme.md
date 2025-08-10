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

weatherNet/
├── final/
│   └── dataset.py
├── models\_code/
│   └── model\_5.py             # Spike-aware hybrid LSTM + CNN architecture
│   └── model\_3.py             # LSTM-Attention model
│   └── other models…
├── scalers/
│   └── feature\_scaler\_seq24.pkl
│   └── feature\_scaler\_seq12.pkl
├── models/
│   └── spike\_aware\_q95\_seq24.pth
│   └── spike\_aware\_q95\_seq12.pth
│   └── version2.pth
├── training\_codes/
│   └── training\_5.py
│   └── training\_6.py
├── final\_fetch.py             # Preprocessing & Weatherbit integration
├── main.py                    # FastAPI server
├── pred.py                    # CLI prediction script
├── test\_prediction\_plot.py    # Local 7-day evaluation script
├── requirements.txt
└── readme.md

```

Then you can enhance with short descriptions:

- **final/** — Data handling and sequencing logic (PyTorch Dataset class).  
- **models_code/** — All model architectures (LSTM variants, hybrids, etc.).  
- **scalers/** — Saved feature scalers used during training/inference.  
- **models/** — Saved PyTorch weights for trained model versions.  
- **training_codes/** — Python scripts used to train models (with spike-aware logic).  
- **final_fetch.py** — Weatherbit API fetching + feature harmonization (TOA, clipping, night masking).  
- **main.py** — FastAPI server providing live prediction and recent data endpoints.  
- **pred.py** — CLI for predicting the next hour's value from console.  
- **test_prediction_plot.py** — Script to compare predictions vs real for the past 7 days and plot results.
---


## 🚀 Running the API Server

1. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

2. **Start FastAPI server**:

   ```bash
   uvicorn main:app --reload
   ```

3. **Test API in browser**:
   Open: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---
## 📥 API Usage

### 1️⃣ Predict Next Hour Solar Irradiance

**Endpoint:**

```
GET /predict
```

**Test URL (Delhi, India):**
[http://127.0.0.1:8000/predict?lat=28.6139\&lon=77.2090](http://127.0.0.1:8000/predict?lat=28.6139&lon=77.2090)

**Response Example:**

```json
{
  "location": "Delhi",
  "prediction_wm2": 378.65,
  "predicted_for": "2025-08-02 14:00:00"
}
```

---

### 2️⃣ Get Last 7 Days Actual Solar Data

**Endpoint:**

```
GET /last7days
```

**Test URL (Delhi, India):**
[http://127.0.0.1:8000/last7days?lat=28.6139\&lon=77.2090](http://127.0.0.1:8000/last7days?lat=28.6139&lon=77.2090)

**Response Example:**

```json
{
  "location": "Delhi",
  "unit": "W/m²",
  "data": [
    {"timestamp": "2025-07-26 14:00:00", "value": 512.34},
    {"timestamp": "2025-07-26 15:00:00", "value": 498.21},
    ...
  ]
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

## 📄 License

MIT License © 2025

---

