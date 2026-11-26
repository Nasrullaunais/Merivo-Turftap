export default {
  loading: "Loading",
  address: (slug: string) => `${slug}.turftap.lk`,
  poweredBy: "Bookings by TurfTap",
  notFound: {
    title: "We couldn't find this venue",
    body: "Check the address and try again.",
  },
  notAvailable: {
    title: "Not available right now",
    body: "This venue isn't taking bookings at the moment. Please check back later.",
  },
  failed: {
    title: "We couldn't connect",
    body: "Check your internet connection and try again.",
    retry: "Try again",
  },
};
