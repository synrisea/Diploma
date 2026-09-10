export interface CandidatePlace {
  id: string;
  name: string;
  categoryName: string | null;
}

export interface PlanItineraryRequest {
  wish: string;
  candidatePlaces: CandidatePlace[];
}

export interface PlanItineraryResponse {
  placeIds: string[];
}
