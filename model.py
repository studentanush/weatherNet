import torch.nn as nn

class SolarLSTM(nn.Module):
    def __init__(self, input_size, hidden_size=64, num_layers=2):
        super(SolarLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        out, _ = self.lstm(x)  # out: [batch, seq_len, hidden]
        out = out[:, -1, :]    # take last time step
        return self.fc(out)
