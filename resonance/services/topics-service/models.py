from pydantic import BaseModel

class CandidatePlace(BaseModel):
    id: str
    name: str
    categoryName: str | None = None

class PlanItineraryRequest(BaseModel):
    wish: str
    candidatePlaces: list[CandidatePlace]
