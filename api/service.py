from transformers import AutoTokenizer
from pathlib import Path
import onnxruntime as ort

ROOT = Path(__file__).parents[1]
TOKENIZER_PATH = "tokenizer"




idx_to_label = [
    'POS', '$', 'UH', "''", 'CD', 'NNPS', 'VBZ', '#', '.', 'PRP$', 
    ',', 'WDT', ':', 'MD', 'VB', 'CC', 'EX', 'SYM', 'NNS', 'JJR', 
    'VBN', 'RBS', 'WP$', 'VBP', 'NNP', '-NONE-', 'JJS', 'RB', '-RRB-', 
    'WP', 'RP', 'RBR', '-LRB-', 'PRP', 'LS', 'VBG', '``', 'DT', 'NN', 
    'VBD', 'FW', 'WRB', 'JJ', 'TO', 'PDT', 'IN'
]

class Tagging:
    def __init__(self, model_path):
        self.session = ort.InferenceSession(
            str(model_path), providers=["CPUExecutionProvider"]
        )
        self.tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_PATH)
        self.input_name = self.session.get_inputs()[0].name
        
    def predict(self, text):
        tokenized = self.tokenizer(text, is_split_into_words=False, 
                              padding='max_length', max_length=70,
                              truncation=True, return_tensors = 'pt')
        input_ids =  tokenized.input_ids.cpu().numpy()
        attention_mask= tokenized.attention_mask.cpu().numpy()
        inputs_onnx = {
            "input_ids": input_ids,
            "attention_mask": attention_mask
        }

        
        output = self.session.run(None, inputs_onnx)[0]
        pred = output.argmax(1)[0]
    
        word_ids = tokenized.word_ids()
        label = []
        curr_word_id = None
        sep_id = None
        for i, word_id in enumerate(word_ids):
            if word_id is not None and word_id != curr_word_id:
                label.append(idx_to_label[pred[i]])
                curr_word_id = word_id
            elif word_id is None and curr_word_id is not None:
                sep_id = i
                break
        tokens = self.tokenizer.convert_ids_to_tokens(input_ids[0][1:sep_id])
        new_tokens = []
        sub_words = None
        for token in tokens:
            if token.startswith('#'):
                sub_words.append(token)
            else:
                if sub_words:
                    new_tokens.append(self.tokenizer.convert_tokens_to_string(sub_words))
                sub_words = [token]
        new_tokens.append(self.tokenizer.convert_tokens_to_string(sub_words))
        return {
            "text":text,
            "tokens":new_tokens,
            "label": label
        }



