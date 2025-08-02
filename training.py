import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
import pandas as pd
import matplotlib.pyplot as plt
import os

from model import SolarLSTM
from dataset import SolarLSTMDataset


def evaluate_model(model, val_loader, criterion, device='cuda'):
    model.eval()
    val_loss = 0.0
    with torch.no_grad():
        for X, y in val_loader:
            X, y = X.to(device), y.to(device)
            preds = model(X)
            loss = criterion(preds, y)
            val_loss += loss.item() * X.size(0)
    return val_loss / len(val_loader.dataset)


def train_model(model, train_loader, val_loader, epochs=20, lr=0.001, device='cuda'):
    model.to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    loss_history = {}

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
        loss_history[epoch] = train_loss
        print(f"Epoch {epoch+1}: Train Loss = {train_loss:.4f}, Val Loss = {val_loss:.4f}")

    return model, loss_history


def plot_loss(history, save_path=None):
    plt.plot(list(history.keys()), list(history.values()))
    plt.xlabel("Epoch")
    plt.ylabel("Train Loss")
    plt.grid(True)
    if save_path:
        plt.savefig(save_path)
    plt.show()


def main():
    df = pd.read_csv("dataset/final.csv")
    df['datetime'] = pd.to_datetime(df['datetime'])

    dataset = SolarLSTMDataset(df, seq_len=24)

    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=64)

    input_size = dataset.X.shape[2]
    model = SolarLSTM(input_size=input_size)

    model, loss_history = train_model(model, train_loader, val_loader, epochs=100, lr=0.01)

    os.makedirs("models", exist_ok=True)
    torch.save(model.state_dict(), "models/version2.pth")

    plot_loss(loss_history, save_path="loss_plot.png")


if __name__ == "__main__":
    main()
