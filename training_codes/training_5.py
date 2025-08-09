import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split, WeightedRandomSampler
import pandas as pd
import matplotlib.pyplot as plt

from final.dataset import SolarLSTMDataset
from models_code.model_5 import SpikeAwareHybrid  # adjust name if different

# ---------------- Loss Function ---------------- #
class WeightedQuantileLoss(nn.Module):
    def __init__(self, q=0.9, high_weight=5.0, threshold=500):
        super().__init__()
        self.q = q
        self.high_weight = high_weight
        self.threshold = threshold

    def forward(self, preds, target):
        errors = target - preds
        base_loss = torch.max(self.q * errors, (self.q - 1) * errors)

        # Weight high peaks more
        weights = torch.ones_like(target)
        weights[target > self.threshold] = self.high_weight

        return torch.mean(weights * base_loss)


# ---------------- Evaluation ---------------- #
def evaluate_model(model, val_loader, criterion, device):
    model.eval()
    val_loss = 0.0
    with torch.no_grad():
        for X, y in val_loader:
            X, y = X.to(device), y.to(device)
            preds = model(X)
            loss = criterion(preds, y)
            val_loss += loss.item() * X.size(0)
    return val_loss / len(val_loader.dataset)


# ---------------- Training ---------------- #
def train(model, train_loader, val_loader, epochs, lr, device, save_path):
    model.to(device)
    criterion = WeightedQuantileLoss(q=0.9, high_weight=5.0, threshold=500)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    best_val_loss = float("inf")
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
        val_loss = evaluate_model(model, val_loader, criterion, device)

        history["train"].append(train_loss)
        history["val"].append(val_loss)

        print(f"Epoch {epoch+1}/{epochs} - Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), save_path)
            print(f"✅ Saved new best model to {save_path}")

    return history


# ---------------- Plot Loss ---------------- #
def plot_loss(history):
    plt.figure(figsize=(8,5))
    plt.plot(history["train"], label="Train Loss")
    plt.plot(history["val"], label="Val Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True)
    plt.show()


# ---------------- Main ---------------- #
if __name__ == "__main__":
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Load dataset
    df = pd.read_csv("/content/weatherNet/dataset/final.csv")  # adjust path if needed
    df['datetime'] = pd.to_datetime(df['datetime'])

    dataset = SolarLSTMDataset(df, seq_len=24)

    # Split dataset first
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])

    # Create oversampling weights only for train set
    train_targets = [train_dataset[i][1].item() for i in range(len(train_dataset))]
    train_weights = [5.0 if t > 500 else 1.0 for t in train_targets]
    sampler = WeightedRandomSampler(train_weights, num_samples=len(train_weights), replacement=True)

    # DataLoaders
    train_loader = DataLoader(train_dataset, batch_size=64, sampler=sampler)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False)

    # Model
    model = SpikeAwareHybrid(input_size=len(dataset.feature_cols)).to(device)

    # Train
    save_path = "models/best_spike_aware_1.pth"
    os.makedirs("models", exist_ok=True)

    history = train(model, train_loader, val_loader, epochs=50, lr=0.001, device=device, save_path=save_path)

    # Plot loss
    plot_loss(history)
