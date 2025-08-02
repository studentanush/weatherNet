import torch.nn as nn

class SolarLSTM(nn.Module):
    def __init__(self, input_size, hidden_size=64, num_layers=2, fc_hidden=64, dropout=0.3):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=dropout)

        self.fc_layers = nn.Sequential(
            nn.Linear(hidden_size, fc_hidden),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(fc_hidden, fc_hidden // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(fc_hidden // 2, 1)
        )

    def forward(self, x):
        out, _ = self.lstm(x)  # [batch, seq_len, hidden]
        out = out[:, -1, :]    
        return self.fc_layers(out)
