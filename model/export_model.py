import torch
import torch.nn as nn
from pathlib import Path
from transformers import AutoModel, AutoTokenizer   

class POSClassifier(nn.Module):
    def __init__(self, backbone, num_classes, p):
        super(POSClassifier, self).__init__()
        self.encoder = backbone
        dim = self.encoder.config.dim
        self.fc = nn.Sequential(
            nn.Linear(dim, dim),
            nn.Dropout(p),
            nn.GELU(),
            nn.Linear(dim, num_classes)
        )

    def forward(self, input_ids, attention_mask):
        o1 = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        o2 = self.fc(o1.last_hidden_state)
        return o2.permute(0, 2, 1)
    



ROOT = Path(__file__).parents[1]
WEIGHTS_PATH = ROOT / "best_model.bin"
ONNX_PATH = ROOT / "model.onnx"

input_ids = torch.randint(100, 1000, size=(1, 70), dtype=torch.long)
attention_mask = torch.ones( size=(1, 70), dtype=torch.long)

model_name = 'distilbert-base-uncased'
backbone = AutoModel.from_pretrained(model_name)
model = POSClassifier(backbone, 47, 0.3)
model.load_state_dict(torch.load(str(WEIGHTS_PATH), weights_only=True,  map_location=torch.device('cpu')))

dummy_input = (input_ids, attention_mask)


torch.onnx.export(
    model,                  
    dummy_input,            
    ONNX_PATH,              
    input_names=["input_ids", "attention_mask"], 
    output_names=['output'],
    dynamic_axes={
        "input_ids": {0: "batch_size", 1: "sequence_length"},
        "attention_mask": {0: "batch_size", 1: "sequence_length"}
    }
)
