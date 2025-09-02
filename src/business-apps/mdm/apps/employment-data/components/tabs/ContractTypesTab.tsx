import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardContent,
  Input,
  Spinner,
  DataTable,
  Icon,
  Badge,
} from "@newwork/nw-design-system";
import {
  EyeIcon,
  ArrowsDownUpIcon,
  PlusIcon,
  PencilSimpleLineIcon,
  FileCodeIcon,
  TagIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { ColumnDef } from "@tanstack/react-table";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import { useUserLocale } from "@/common/locale/useUserLocale";
import CardTabHeaderComponent from "../../../generic-components/card";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { DeleteButton } from "../../../generic-components/delete-button/DeleteButton";
import ContractTypeForm from "@/business-apps/mdm/forms/contract-type-form/ContractTypeForm";
import SheetWrapperComponent from "../../../generic-components/sheet-wrapper/SheetWrapperComponent";
import { useGetContractTypesData } from "../../queries/ContractTypesQueries";
import { toast } from "sonner";

export interface ContractType {
  id: string;
  code: string;
  value: string;
  alternativeCode?: string;
  additionalValue1?: string;
  additionalValue2?: string;
  additionalValue3?: string;
  translations: Array<{
    localeCode: string;
    value: string;
  }>;
}

export interface ContractTypesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const DATA_TEST_ID_PREFIX = "ContractTypesTab";

const ContractTypesTab: React.FC<ContractTypesTabProps> = ({
  accessToken,
  prefixDataTestId,
}) => {
  const { t } = useTranslation();
  const userLocale = useUserLocale() ?? "en-US";
  const catalogClient = useCatalogManagerClient(accessToken);
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX);

  const { fetchContractTypes } = useGetContractTypesData(
    catalogClient,
    userLocale
  );

  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const loadContractTypes = async () => {
    try {
      setLoading(true);

      const types = (await fetchContractTypes()) ?? [];
      setContractTypes(types);
    } catch (error) {
      toast.error("Failed to load contract types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedType) {
      const newContractType = contractTypes.find(
        (contractType) => contractType.id === selectedType.id
      );

      if (newContractType) {
        setSelectedType(newContractType);
      }
    }
  }, [contractTypes]);

  useEffect(() => {
    loadContractTypes();
  }, [searchTerm, userLocale]);

  const handleDelete = async (record: ContractType) => {
    await catalogClient.deleteCatalogEntry(record.id);

    setContractTypes((prev) =>
      prev.filter((contractType) => contractType.id !== record.id)
    );
  };

  const handleViewDetails = (record: ContractType) => {
    setSelectedType(record);
    setIsDrawerVisible(true);
  };

  const drawerItems = useMemo(() => {
    if (!selectedType) return [];
    const items = [
      {
        icon: <InfoIcon />,
        title: "Basic Information",
        items: [
          {
            label: "Name",
            value: selectedType.value,
          },
          {
            label: "Code",
            value: selectedType.code || "-",
          },
          {
            label: "ID",
            value: selectedType.id,
          },
        ],
        verticalTable: true,
      },
      {
        icon: <InfoIcon />,
        title: "Additional Values",
        items: [
          {
            label: "Additional Value 1",
            value: selectedType.additionalValue1,
          },
          {
            label: "Additional Value 2",
            value: selectedType.additionalValue2 || "-",
          },
          {
            label: "Additional Value 3",
            value: selectedType.additionalValue3 || "-",
          },
        ],
      },
    ];

    selectedType.alternativeCode &&
      items[1].items.push({
        label: "Alternative Code",
        value: `Alt: ${selectedType.alternativeCode}`,
      });

    return items;
  }, [selectedType]);

  const renderContractTypesTable = () => {
    const columns: ColumnDef<ContractType>[] = [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Code
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const code = getValue();
          return (
            <div className="gba:flex gba:items-center">
              <Badge variant="info">{(code as string) ?? "N/A"}</Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "value",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Name
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = getValue();
          return (
            <div className="gba:flex gba:items-center">
              <div className="gba:font-semibold">{name as string}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "alternativeCode",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="gba:h-auto gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Alternative Code
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const alternativeCode = getValue();
          return (
            <div className="gba:flex gba:items-center">
              {(alternativeCode as string) ?? "-"}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="gba:flex gba:w-[20px]">Actions</div>,
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => (
          <div className="gba:flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetails(row.original)}
              data-testid={`${dataTestId}-view-contract-type-${row.original.id}`}
            >
              <EyeIcon className="gba:h-4 gba:w-4" />
            </Button>
            <ContractTypeForm
              childAddButton={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <PencilSimpleLineIcon />
                </Button>
              }
              refetch={loadContractTypes}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
              contractType={row.original}
            />
            <DeleteButton
              onDelete={() => handleDelete(row.original)}
              itemName={row.original.value}
              itemTitle="Employment Type"
            />
          </div>
        ),
      },
    ];

    const dataTable = contractTypes.map((contractType) => ({
      id: contractType.id,
      code: contractType.code,
      value: contractType.value,
      alternativeCode: contractType.alternativeCode,
    }));

    return (
      <DataTable
        defaultDataSetId="contract-types"
        dataSets={[
          {
            id: "contract-types",
            label: "Contract Types",
            data: dataTable,
            columns: columns,
          },
        ]}
      />
    );
  };

  return (
    <Card data-testid={`${dataTestId}`} className="gba:overflow-hidden">
      {!loading && (
        <CardTabHeaderComponent
          addButton={
            <ContractTypeForm
              childAddButton={
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  data-testid={`${dataTestId}-add-button`}
                >
                  <PlusIcon /> Add Contract Type
                </Button>
              }
              refetch={loadContractTypes}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
            />
          }
          cardTitle={`${t("hr.contract_types", "Contract Types")} (${
            contractTypes.length
          })`}
          cardDescription="Manage contract types and their classifications. Contract types define the employment agreements and terms."
        />
      )}

      <CardContent>
        <div className="gba:mb-6 gba:relative gba:max-w-sm">
          <Input
            placeholder="Search contract types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="gba:pl-10"
            data-testid={`${dataTestId}-search-input`}
          />
        </div>

        {loading && contractTypes.length === 0 ? (
          <div
            data-testid={`${dataTestId}`}
            className="gba:flex gba:justify-center gba:items-center gba:h-64"
          >
            <Spinner />
          </div>
        ) : (
          <div className="gba:overflow-hidden">
            {renderContractTypesTable()}
          </div>
        )}

        {selectedType && (
          <SheetWrapperComponent
            prefixDataTestId={dataTestId}
            isDrawerVisible={isDrawerVisible}
            onOpenChange={(openStatus) => {
              if (!openStatus) {
                setSelectedType(null);
              }
              setIsDrawerVisible(openStatus);
            }}
            title="Contract Type Details"
            titleIcon={FileCodeIcon}
            drawerItems={drawerItems}
            extraContent={
              <div className="gba:text-xs gba:text-gray-500 gba:flex gba:items-center gba:justify-center gba:gap-2">
                <Icon icon={TagIcon} className="gba:!w-4 gba:!h-4" />
                This contract type can be used to classify employees and job
                positions.
              </div>
            }
            footerButtons={[
              <ContractTypeForm
                childAddButton={
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <PencilSimpleLineIcon /> Edit
                  </Button>
                }
                refetch={loadContractTypes}
                accessToken={accessToken}
                prefixDataTestId={prefixDataTestId}
                contractType={selectedType}
                isDrawerActive={true}
              />,
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
};

export { ContractTypesTab };
