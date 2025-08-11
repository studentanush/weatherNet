import torch
import torch.nn as nn

class SpikeAwareHybrid(nn.Module):
    def __init__(self, input_size, hidden_size=256, num_lstm_layers=3, dropout=0.3, num_heads=8):
        super().__init__()
        self.cnn_small = nn.Conv1d(input_size, 128, kernel_size=3, padding=1)
        self.cnn_med = nn.Conv1d(input_size, 128, kernel_size=5, padding=2)
        self.cnn_dil = nn.Conv1d(input_size, 128, kernel_size=3, dilation=2, padding=2)
        self.bn = nn.BatchNorm1d(384)
        self.relu = nn.ReLU()
        self.lstm = nn.LSTM(384, hidden_size, num_layers=num_lstm_layers,
                            batch_first=True, bidirectional=True, dropout=dropout)
        self.attn = nn.MultiheadAttention(hidden_size * 2, num_heads=num_heads, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size * 4, hidden_size * 2),  # note: concat global+local pools
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size * 2, hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, 1)
        )

    def forward(self, x):
        x_t = x.transpose(1, 2) 
        f1 = self.relu(self.cnn_small(x_t))
        f2 = self.relu(self.cnn_med(x_t))
        f3 = self.relu(self.cnn_dil(x_t))
        x_cnn = torch.cat([f1, f2, f3], dim=1)
        x_cnn = self.bn(x_cnn).transpose(1, 2)  # [batch, seq, channels]

        # LSTM + Attention
        lstm_out, _ = self.lstm(x_cnn)
        attn_out, _ = self.attn(lstm_out, lstm_out, lstm_out)

        # Global mean pooling (trend) + max pooling (spikes)
        mean_pool = attn_out.mean(dim=1)
        max_pool, _ = torch.max(attn_out, dim=1)

        # Concatenate both to preserve spikes
        context = torch.cat([mean_pool, max_pool], dim=1)

        return self.fc(context)
