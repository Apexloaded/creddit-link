import React from "react";
import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "../ui/input-group";

export default function PositionFilters() {
  return (
    <div>
      <InputGroup className="max-w-xs">
        <InputGroupInput placeholder="Search positions..." />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
