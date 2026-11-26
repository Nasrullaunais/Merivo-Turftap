import { createFileRoute } from "@tanstack/react-router";
import { Id, LocalDate } from "@turftap/contract";

import { BackLink } from "../../components/BackLink";
import { NotFoundPanel } from "../../components/NotFoundPanel";
import { ResourceHeader } from "../../features/resources/ResourceHeader";
import { useResource } from "../../features/resources/useResource";
import { SlotPicker } from "../../features/slots/SlotPicker";
import { useVenue } from "../../features/venues/useVenue";
import resources from "../../i18n/en/resources";

type ResourceSearch = { date?: string };

export const Route = createFileRoute("/resources/$resourceId")({
  params: {
    parse: ({ resourceId }) => ({ resourceId: Id.parse(Number(resourceId)) }),
    stringify: ({ resourceId }) => ({ resourceId: String(resourceId) }),
  },
  validateSearch: (search): ResourceSearch => {
    const date = LocalDate.safeParse(search.date);
    return date.success ? { date: date.data } : {};
  },
  component: ResourcePage,
});

function ResourcePage() {
  const { resourceId } = Route.useParams();
  const { date } = Route.useSearch();
  const navigate = Route.useNavigate();
  const resource = useResource(resourceId);
  const venueId = resource.data?.venueId;
  const venue = useVenue(venueId);

  if (resource.isError || venue.isError) return <NotFoundPanel {...resources.notFound} />;
  return (
    <div className="grid grid-cols-1 gap-5">
      {venueId ? (
        <BackLink to="/venues/$venueId" params={{ venueId }} label={venue.data?.name} />
      ) : (
        <BackLink to="/" />
      )}
      <ResourceHeader resource={resource.data} />
      {resource.data && venue.data && (
        <SlotPicker
          resource={resource.data}
          venue={venue.data}
          date={date}
          onDateChange={(day) =>
            void navigate({ search: (previous) => ({ ...previous, date: day }), replace: true })
          }
          onBook={(choice) =>
            void navigate({
              to: "/book",
              search: (previous) => ({ ...previous, resourceId, ...choice }),
            })
          }
        />
      )}
    </div>
  );
}
