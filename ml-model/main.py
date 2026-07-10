import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from openai import OpenAI  # The xAI SDK uses the standard OpenAI client layout

app = FastAPI(title="Bree AI - Machine Learning Core")

# Enable CORS so your Spring Boot or React frontend can talk to it directly if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── CONFIGURATION: WHERE TO PUT YOUR GROK API KEY ──────────────────────
# Option 1 (Best Practice): Set it as an environment variable in your terminal before running:
# export XAI_API_KEY="your-actual-grok-api-key-here"
#
# Option 2 (Hackathon Quick-Fix): Paste it directly into the string below:
GROK_API_KEY = os.getenv("XAI_API_KEY", "YOUR_ACTUAL_GROK_API_KEY_HERE")

# Initialize the xAI client pointing to their official base URL
client = OpenAI(
    api_key=GROK_API_KEY,
    base_url="https://api.xai.dev/v1",
)

# ─── PYDANTIC SCHEMAS FOR DATA PIPELINING ────────────────────────────────
class ExpenseItem(BaseModel):
    name: str
    amount: str

class BudgetData(BaseModel):
    income: str
    expenses: List[ExpenseItem]

class ChatRequest(BaseModel):
    message: str
    username: str
    budget: BudgetData

# ─── BREE AI CORE ENDPOINT ───────────────────────────────────────────────
@app.post("/api/bree/chat")
async def chat_with_bree(request: ChatRequest):
    if "YOUR_ACTUAL_GROK" in GROK_API_KEY:
        raise HTTPException(status_code=500, detail="Missing Grok API Key in main.py")

    try:
        # Format the budget details cleanly into text context for the model
        expense_list = ", ".join([f"{e.name}: ${e.amount}" for e in request.budget.expenses])

        # Build a robust system prompt giving Bree her persona and financial context
        system_instruction = (
            f"You are Bree AI, a smart, empathetic, and slightly witty financial advisor assistant. "
            f"You are talking to {request.username}. "
            f"Their financial profile: Monthly Income: ${request.budget.income}. "
            f"Current Expenses: [{expense_list}]. "
            f"Provide highly actionable, personalized financial advice based on their text message. "
            f"Keep your tone supportive, clear, conversational, and direct."
        )

        # Call the Grok model
        completion = client.chat.completions.create(
            model="grok-2-latest",  # Standard production model for conversational tasks
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": request.message}
            ],
            temperature=0.7
        )

        # Extract the response text
        grok_reply = completion.choices[0].message.content

        # Return exact JSON structure your Spring Boot / React chain is looking for
        return {"reply": grok_reply}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grok API Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Start server locally on port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)