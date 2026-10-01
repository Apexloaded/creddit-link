import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "@/store";
import { IPosition } from "@/interfaces/creddit-lens.interface";

export interface PositionState {
  position: IPosition | null;
}

const initialState = {
  position: null,
} as PositionState;

export const positionSlice = createSlice({
  name: "position",
  initialState,
  reducers: {
    setPosition: (state, action: PayloadAction<IPosition>) => {
      state.position = action.payload;
    },
  },
});

export const { setPosition } = positionSlice.actions;

export const getPosition = (state: RootState) => state["position"];

export default positionSlice.reducer;
