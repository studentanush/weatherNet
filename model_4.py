import torch
import torch.nn as nn

class DeepSolarModel(nn.Module):
    def __init__(self, input_size, hidden_size=256, num_lstm_layers=4, dropout=0.3, num_heads=8):
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv1d(input_size, 128, kernel_size=5, padding=2),
            nn.ReLU(),
            nn.BatchNorm1d(128),
            nn.Conv1d(128, 256, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.Conv1d(256, 256, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(256)
        )
        self.lstm = nn.LSTM(256, hidden_size, num_layers=num_lstm_layers, 
                            batch_first=True, bidirectional=True, dropout=dropout)
        self.attn = nn.MultiheadAttention(hidden_size * 2, num_heads=num_heads, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size * 2, hidden_size * 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size * 2, hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, hidden_size // 4),
            nn.ReLU(),
            nn.Linear(hidden_size // 4, 1)
        )

    def forward(self, x):
        # x: [batch, seq_len, features]
        x = x.transpose(1, 2)  # For CNN
        x = self.cnn(x)
        x = x.transpose(1, 2)  # Back for LSTM
        
        lstm_out, _ = self.lstm(x)
        
        # Attention
        attn_out, _ = self.attn(lstm_out, lstm_out, lstm_out)
        
        # Global mean pooling
        context = torch.mean(attn_out, dim=1)
        
        return self.fc(context)
