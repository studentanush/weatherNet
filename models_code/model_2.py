import torch
import torch.nn as nn

class TimeSeriesTransformerV2(nn.Module):
    def __init__(self, input_size, d_model=256, nhead=8, num_layers=4, dropout=0.2):
        super(TimeSeriesTransformerV2, self).__init__()
        
        self.input_proj = nn.Sequential(
            nn.Linear(input_size, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, d_model),
            nn.GELU()
        )
        encoder_layer = nn.TransformerEncoderLayer(d_model=d_model, nhead=nhead, dropout=dropout, batch_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        self.fc = nn.Sequential(
            nn.Linear(d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, d_model // 4),
            nn.GELU(),
            nn.Linear(d_model // 4, 1)
        )
    
    def forward(self, x):  
        x = self.input_proj(x) 
        x = self.transformer(x) 
        x = x[:, -1, :]          
        return self.fc(x)