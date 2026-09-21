from pydantic import BaseModel

class CandidatePlace(BaseModel):
    id: str
    name: str
    categoryName: str | None = None

class PlanItineraryRequest(BaseModel):
    wish: str
    candidatePlaces: list[CandidatePlace]

class ApproveTopicRequest(BaseModel):
    label: str
    expectedComputedAt: str | None = None

class MergeTopicsRequest(BaseModel):
    sourceId: int
    targetId: int

class RenameDimensionRequest(BaseModel):
    label: str
