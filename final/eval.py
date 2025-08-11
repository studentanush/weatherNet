import torch
import matplotlib.pyplot as plt
from sklearn.metrics import mean_squared_error, mean_absolute_error
import numpy as np

def evaluate_and_plot(model, val_loader, device='cuda'):
    model.eval()
    preds_all = []
    targets_all = []

    with torch.no_grad():
        for X, y in val_loader:
            X, y = X.to(device), y.to(device)
            preds = model(X)
            preds_all.append(preds.cpu().numpy())
            targets_all.append(y.cpu().numpy())

    preds_all = np.concatenate(preds_all).flatten()
    targets_all = np.concatenate(targets_all).flatten()

    # Compute metrics
    rmse = np.sqrt(mean_squared_error(targets_all, preds_all))
    mae = mean_absolute_error(targets_all, preds_all)

    print(f"RMSE: {rmse:.4f}")
    print(f"MAE : {mae:.4f}")

    # Plot
    plt.figure(figsize=(8, 6))
    plt.scatter(targets_all, preds_all, alpha=0.3, s=10)
    plt.plot([targets_all.min(), targets_all.max()], [targets_all.min(), targets_all.max()], 'r--')
    plt.xlabel("Actual")
    plt.ylabel("Predicted")
    plt.title("Actual vs. Predicted Solar Energy")
    plt.grid(True)
    plt.tight_layout()
    plt.show()
