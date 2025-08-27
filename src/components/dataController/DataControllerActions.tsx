import React from "react";

export interface DataControllerActionsProps {
  actions?: React.ReactNode | React.ReactNode[];
  addButton?: {
    onClick: () => void;
    label: string;
    icon?: React.ReactNode;
    "data-testid"?: string;
  };
}

function getNodeSignature(node: React.ReactNode): string {
  if (React.isValidElement(node)) {
    const anyEl: any = node as any;
    const dataTestId = anyEl?.props?.["data-testid"];
    const key = anyEl?.key != null ? String(anyEl.key) : "";
    const typeName = (anyEl?.type?.displayName || anyEl?.type?.name || "type") as string;
    return ["el", dataTestId || "no-testid", key || "no-key", typeName].join(":");
  }
  if (Array.isArray(node)) {
    return node.map((n) => getNodeSignature(n)).join("|");
  }
  return typeof node + ":" + String(node);
}

function getActionsSignature(actions?: React.ReactNode | React.ReactNode[]): string {
  if (!actions) return "none";
  if (Array.isArray(actions)) {
    return actions.map((a) => getNodeSignature(a)).join("||");
  }
  return getNodeSignature(actions);
}

function getAddButtonSignature(addButton?: DataControllerActionsProps["addButton"]): string {
  if (!addButton) return "none";
  const id = addButton["data-testid"] || "no-testid";
  return `${id}:${addButton.label}`;
}

const InnerDataControllerActions: React.FC<Readonly<DataControllerActionsProps>> = ({ actions, addButton }) => {
  return (
    <div className="gba:flex gba:flex-row gba:items-center gba:gap-2 gba:w-full gba:justify-end" data-testid="data-controller-actions-section">
      {addButton && (
        <button
          className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
          onClick={addButton.onClick}
          data-testid={addButton["data-testid"] || "data-controller-add-button"}
          type="button"
        >
          <span className="gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:flex-none order-0 gba:grow-0">
            {addButton.icon}
          </span>
          <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-black gba:flex-none order-1 gba:grow-0">
            {addButton.label}
          </span>
        </button>
      )}
      {actions && (
        Array.isArray(actions) ? (
          actions.map((action, idx) => {
            let key: React.Key = idx;
            if (React.isValidElement(action) && (action.props as any)?.["data-testid"]) {
              key = (action.props as any)["data-testid"];
            }
            return (
              <div
                key={key}
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:h-8 gba:rounded gba:gap-1"
                data-testid={`data-controller-action-${idx}`}
              >
                {action}
              </div>
            );
          })
        ) : (
          <div className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:h-8 gba:rounded gba:gap-1" data-testid="data-controller-single-action">
            {actions}
          </div>
        )
      )}
    </div>
  );
};

export const DataControllerActions = React.memo(
  InnerDataControllerActions,
  (prev, next) => {
    const prevActionsSig = getActionsSignature(prev.actions);
    const nextActionsSig = getActionsSignature(next.actions);
    if (prevActionsSig !== nextActionsSig) return false;

    const prevAddSig = getAddButtonSignature(prev.addButton);
    const nextAddSig = getAddButtonSignature(next.addButton);
    if (prevAddSig !== nextAddSig) return false;

    return true;
  }
);

export default DataControllerActions;


