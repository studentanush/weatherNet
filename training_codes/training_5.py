import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split, WeightedRandomSampler
import pandas as pd
import matplotlib.pyplot as plt
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from final.dataset_2 import SolarLSTMDataset  # updated dataset with log1p
from models_code.model_5 import SpikeAwareHybrid  # your deep model

# ---------------- Loss Function ---------------- #
class QuantileLoss(nn.Module):
    def __init__(self, q=0.95):
        super().__init__()
        self.q = q
    def forward(self, preds, target):
        errors = target - preds
        return torch.mean(torch.max(self.q * errors, (self.q - 1) * errors))

# ---------------- Evaluation ---------------- #
def evaluate_model(model, val_loader, criterion, device='cuda'):
    model.eval()
    val_loss = 0.0
    actual, predicted = [], []
    with torch.no_grad():
        for X, y in val_loader:
            X, y = X.to(device), y.to(device)
            preds = model(X)
            loss = criterion(preds, y)
            val_loss += loss.item() * X.size(0)

            # inverse transform
            actual.extend(SolarLSTMDataset.inverse_transform_target(y.cpu().numpy()))
            predicted.extend(SolarLSTMDataset.inverse_transform_target(preds.cpu().numpy()))

    return val_loss / len(val_loader.dataset), actual, predicted

# ---------------- Training ---------------- #
def train(model, train_loader, val_loader, epochs=20, lr=0.001, device='cuda', save_path=None):
    model.to(device)
    criterion = QuantileLoss(q=0.95)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    history = {"train": [], "val": []}

    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        for X, y in train_loader:
            X, y = X.to(device), y.to(device)
            optimizer.zero_grad()
            preds = model(X)
            loss = criterion(preds, y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * X.size(0)

        train_loss /= len(train_loader.dataset)
        val_loss, _, _ = evaluate_model(model, val_loader, criterion, device)

        history["train"].append(train_loss)
        history["val"].append(val_loss)
        print(f"Epoch {epoch+1}: Train Loss = {train_loss:.4f}, Val Loss = {val_loss:.4f}")

        if save_path:
            torch.save(model.state_dict(), save_path)

    return history

# ---------------- Main ---------------- #
if __name__ == "__main__":
    df = pd.read_csv("dataset/final.csv")
    dataset = SolarLSTMDataset(df, seq_len=24)

    # Split dataset first
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])

    # Weighted sampler for spikes
    train_targets = [train_dataset[i][1].item() for i in range(len(train_dataset))]
    train_weights = [5.0 if t > torch.log1p(torch.tensor(500.0)) else 1.0 for t in train_targets]
    sampler = WeightedRandomSampler(train_weights, num_samples=len(train_weights), replacement=True)

    # DataLoaders
    train_loader = DataLoader(train_dataset, batch_size=64, sampler=sampler)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False)

    model = SpikeAwareHybrid(input_size=len(dataset.feature_cols))
    os.makedirs("models", exist_ok=True)
    save_path = "models/spike_aware_q95.pth"

    history = train(model, train_loader, val_loader, epochs=50, lr=0.001, device='cuda', save_path=save_path)

    # Final evaluation + plot
    _, actual, predicted = evaluate_model(model, val_loader, QuantileLoss(q=0.95), device='cuda')

    plt.figure(figsize=(12, 6))
    plt.plot(actual, label="Actual Solar Radiation")
    plt.plot(predicted, label="Predicted Solar Radiation")
    plt.xlabel("Time Step")
    plt.ylabel("Solar Radiation")
    plt.title("Model Accuracy: Actual vs Predicted Solar Radiation")
    plt.legend()

    plot_path = "models/spike_eval.png"
    plt.savefig(plot_path, dpi=300)
    print(f"✅ Plot saved to {plot_path}")
    plt.show()
