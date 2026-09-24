'use client';

import Image from "next/image";

export type IConnector = {
  id: string;
  name: string;
  icon?: string;
  onClick: () => void;
};

interface ConnectorProps {
  connector: IConnector;
}

export function ConnectorItem({ connector }: ConnectorProps) {
  const { onClick } = connector;
  return (
    <button
      onClick={() => onClick()}
      className="flex w-full cursor-pointer items-center justify-between px-4 py-3 gap-4 border-b border-primary/50 hover:bg-secondary last-of-type:border-b-0"
    >
      <div className="flex items-center w-full gap-4">
        <div className="flex-1 items-center flex gap-1">
          {connector.icon && (
            <img src={connector.icon} alt={connector.name} width={24} height={24} />
          )}
          <p className="text-base font-normal dark:text-white">{connector.name}</p>
        </div>
      </div>
    </button>
  );
}
