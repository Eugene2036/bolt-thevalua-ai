import type {
  LoaderArgs,
  LinksFunction,
  ActionFunction,
} from "@remix-run/node";
import { useState } from "react";
import { useFetcher } from "@remix-run/react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { twMerge } from "tailwind-merge";

import { CenteredView } from "~/components/CenteredView";
import { Footer } from "~/components/Footer";

import Navbar from "~/components/NavBar";
import { prisma } from "~/db.server";
import { AppLinks } from "~/models/links";
import { ValuationType } from "~/models/plots.validations";
import ScrollingClients from "~/components/ScrollingClients";

import ContactPopupForm from "~/components/ContactPopupForm";
import stylesUrl from "~/../ContactPopupForm.css";

import { DrawerExample } from '~/components/Drawer';

import ContactForm from "~/components/EmailContact";

export async function loader({ request }: LoaderArgs) {
  const [numRes, numComm, numValuers] = await Promise.all([
    prisma.plot.count({
      where: { valuationType: ValuationType.Residential },
    }),
    prisma.plot.count({
      where: { valuationType: ValuationType.Commercial },
    }),
    prisma.user.count({
      where: { isSuspended: false },
    }),
  ]);
  return json({ numRes, numComm, numValuers });
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesUrl },
];

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const name = formData.get("name");
  const email = formData.get("email");
  const message = formData.get("message");

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string"
  ) {
    return json({ error: "Invalid Form Data" }, { status: 400 });
  }

  // Here you can handle the form submission, e.g., send email or store in DB
  console.log("Contact Form Data:", { name, email, message });

  return json({ success: "Message sent successfully!" });
};

const clientLogos = [
  "https://res.cloudinary.com/deacmcthw/image/upload/v1732010242/logos/fnb_rt4eog.png",
  "https://res.cloudinary.com/deacmcthw/image/upload/v1732010203/logos/bbs_iwe3s1.png",
  "https://res.cloudinary.com/deacmcthw/image/upload/v1732010199/logos/bankgaborone_nfvt3l.png",
  "https://res.cloudinary.com/deacmcthw/image/upload/v1732008808/logos/bankofbaroda_e5jtra.png",
  "https://res.cloudinary.com/deacmcthw/image/upload/v1732008804/logos/ndb_wkbpwd.png",
  "https://res.cloudinary.com/deacmcthw/image/upload/v1732008800/logos/letshego_qwnwgi.png",
  "https://res.cloudinary.com/deacmcthw/image/upload/v1732008793/logos/firstcapital_xgsfhd.png",
  "https://res.cloudinary.com/deacmcthw/image/upload/v1732008760/logos/stanbic_prfnfy.webp",
  "https://res.cloudinary.com/deacmcthw/image/upload/v1732010631/logos/gcc_iejipo.png",
  "https://res.cloudinary.com/deacmcthw/image/upload/v1732084694/logos/absa1_xo7wkg.png",
];


export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof loader>();
  const { numRes, numComm, numValuers } = useLoaderData<typeof loader>();
  // const fetcher = useFetcher<typeof action>();

  // const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const relevantProperties = fetcher.data?.numComm || loaderData.numRes || loaderData.numValuers;

  const [isPopupOpen, setPopupOpen] = useState(false);

  const toolbarItems: [string, string][] = [
    ["Products", "#products"],
    ["Services", "#services"],
    ["About", "#about"],
    ["Contact Us", "#contact"],
    ["Log In", AppLinks.Login],
  ];

  return (
    <main className="m-0 p-0 h-full">
      <Navbar />
      <section className="flex main-header flex-col items-stretch w-full align-middle h-[100vh] ">
        <DrawerExample aiContext={JSON.stringify({ properties: relevantProperties })} />
        <div className="flex-row w-full grid grid-cols-1 gap-2 md:gap-6 grow bg-transparent">
          <div className="flex">
            <div className="flex-1">
              <div className="flex flex-col justify-center items-center ">
                <span className="animate-flip-up text-end text-5xl text-white pt-[35vh] drop-shadow-sm font-semibold pb-8 px-2 tracking-wider leading-snug">
                  The Renowned Valuations Software
                </span>
                <span className="text-white drop-shadow-sm text-xl tracking-wider leading-relaxed font-semibold px-2 mobile-hidden">
                  Property valuation platform you can trust
                </span>
                <div className="flex flex-col items-start pt-10">
                  {/* <Link to={AppLinks.Login} className="bg-gray-700/80 text-white rounded-full text-base px-10 py-3 hover:scale-[101%] transition-all duration-150 tracking-wider">
                      Try it for Free
                    </Link> */}
                  <button
                    className="inline-flex text-white bg-[transporent] items-center justify-center rounded-md border border-primary bg-primary px-7 py-3 text-center text-base font-medium hover:border-blue-dark hover:bg-slate-400/80 hover:text-white hover:scale-[101%] transition-all duration-150 tracking-wider drop-shadow-sm"
                    onClick={() => setPopupOpen(true)}
                  >
                    Book a Demo
                  </button>
                  <ContactPopupForm
                    isOpen={isPopupOpen}
                    onClose={() => setPopupOpen(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScrollingClients logos={clientLogos} animationDuration={30} />
      <div className="flex flex-col items-stretch py-12 ">
        <div className=" w-full">
          <CenteredView
            innerProps={{
              className: twMerge(
                "flex flex-col justify-center items-center gap-6 p-6 ",
              ),
            }}
          >
            <section id="about" className="pb-8 lg:pb-[80px] lg:pt-[32px]">
              <h2 className="flex justify-center animate-fade-right pt-5 mb-5 mt-6 text-3xl font-bold leading-tight text-dark text-black sm:text-[40px] sm:leading-[1.2]">
                Improve your valuation process
              </h2>
              <p className="flex justify-center mb-10 text-base leading-relaxed text-body-color dark:text-dark-6">
                Our mission is to transform property valuation, elevate the
                profession, and have fun doing it!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="flex-1  pt-10 pr-5 pb-5 pl-5 m-5 border rounded-2xl shadow-custom transition-transform duration-[500ms] transform hover:translate-y-[-10px]">
                  <img
                    src="/images/main/Versatile.svg"
                    alt="Solution"
                    className="m-auto pb-3"
                  />
                  <h4 className="text-center text-dark dark:text-gray-700/80 mb-[14px] text-[32px] font-semibold">
                    Versatile
                  </h4>
                  <p className="text-center dark:text-dark-6 font-thin text-black text-xl">
                    It is designed to transform the way properties are valued,
                    making the process more accurate, efficient, and versatile.
                  </p>
                </div>
                <div className="flex-1  p-8 m-5 border rounded-2xl shadow-custom transition-transform transform duration-[500ms] hover:translate-y-[-10px]">
                  <img
                    src="/images/main/Solution.svg"
                    alt="Solution"
                    className="m-auto pb-3"
                  />
                  <h4 className="text-center text-dark dark:text-gray-700/80 mb-[14px] text-[32px] font-semibold">
                    Solution
                  </h4>
                  <p className="text-center dark:text-dark-6 font-thin text-black text-xl">
                    RealValua is not just a software, it's a solution crafted by
                    valuers, for valuers.
                  </p>
                </div>
                <div className="flex-1  p-8 m-5 border rounded-2xl shadow-custom transition-transform duration-[500ms] transform hover:translate-y-[-10px]">
                  <img
                    src="/images/main/Transformation.svg"
                    alt="Solution"
                    className="m-auto pb-3"
                  />
                  <h4 className="text-center text-dark dark:text-gray-700/80 mb-[14px] text-[32px] font-semibold">
                    Transformation
                  </h4>
                  <p className="text-center dark:text-dark-6 font-thin text-black text-xl">
                    It is designed to transform the way properties are valued,
                    making the process more accurate, efficient, and versatile.
                  </p>
                </div>
                <div className="flex-1  p-8 m-5 border rounded-2xl shadow-custom transition-transform duration-[500ms] transform hover:translate-y-[-10px]">
                  <img
                    src="/images/main/Flexibility.svg"
                    alt="Solution"
                    className="m-auto pb-3"
                  />
                  <h4 className="text-center text-dark dark:text-gray-700/80 mb-[14px] text-[32px] font-semibold">
                    Flexibility
                  </h4>
                  <p className="text-center dark:text-dark-6 font-thin text-black text-xl">
                    Whether you are dealing with ample market data or scarce
                    comparables, RealValua equips you with the methodologies and
                    flexibility needed to deliver precise valuations.
                  </p>
                </div>
                <div className="flex-1  p-8 m-5 border rounded-2xl shadow-custom transition-transform duration-[500ms] transform hover:translate-y-[-10px]">
                  <img
                    src="/images/main/Transparency.svg"
                    alt="Solution"
                    className="m-auto pb-3"
                  />
                  <h4 className="text-center text-dark dark:text-gray-700/80 mb-[14px] text-[32px] font-semibold">
                    Transparency
                  </h4>
                  <p className="text-center dark:text-dark-6 font-thin text-black text-xl">
                    In whatever we do, say design and process, we keep it clean,
                    clear, and concise.
                  </p>
                </div>
                <div className="flex-1 p-8 m-5 border rounded-2xl shadow-custom transition-transform duration-[500ms] transform hover:translate-y-[-10px]">
                  <img
                    src="/images/main/Team.svg"
                    alt="Solution"
                    className="m-auto pb-3"
                  />
                  <h4 className="text-center text-dark dark:text-gray-700/80 mb-[14px] text-[32px] font-semibold">
                    Team Work
                  </h4>
                  <p className="text-center dark:text-dark-6 font-thin text-black text-xl">
                    We support each other. We have a bias toward action. We are
                    not afraid to make and learn from our mistakes.
                  </p>
                </div>
              </div>
            </section>
          </CenteredView>
        </div>
      </div>

      <div>
        <section
          x-data="{ videoOpen: false }"
          className="relative overflow-hidden"
        >
          <div className="bg-custom-gradient">
            <div className="flex sticky z-10 flex-wrap">
              <div className="w-full px-4 lg:w-1/2 ">
                <div className="pl-[90px] max-w-[560px] pt-[100px] pb-[30px] logo-margin">
                  <h2 className="animate-fade-right mb-6 text-3xl font-bold leading-snug  sm:text-4xl sm:leading-snug md:text-[40px] md:leading-snug">
                    Claim your free demo now
                  </h2>
                  <span className="block mb-3 text-base font-semibold text-lime-500">
                    Discover a smarter way to value properties
                  </span>
                  <p className="text-base leading-relaxed font-thin mb-9">
                    It's time to take your property valuations to another level.
                    RealValua allows you to try our software completely free. To
                    have an in-depth overview all you need is to send us your
                    contact details below, one of our sales reps will contact
                    you as soon as possible...
                  </p>
                  <button
                    className="relative bg-blue-500 hover:bg-blue-700 transform transition-transform duration-[500ms]  inline-block py-3 text-base font-medium text-white border rounded-md px-9"
                    onClick={() => setPopupOpen(true)}
                  >
                    Book a Demo
                  </button>
                  <ContactPopupForm
                    isOpen={isPopupOpen}
                    onClose={() => setPopupOpen(false)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className=" top-3 absolute right-0">
            <img src="/images/main/Group.png" alt="Solution" />
          </div>
        </section>
      </div>
      <section
        id="services"
        className="pb-8 lg:pb-[80px] lg:pt-[100px] container m-auto"
      >
        <h2 className="flex justify-center animate-fade-right pt-5 mb-5 mt-6 text-3xl font-bold leading-tight text-dark text-black sm:text-[40px] sm:leading-[1.2]">
          Property Valuation
        </h2>
        <p className="flex justify-center mb-10 text-base leading-relaxed text-body-color dark:text-dark-6">
          Valua offers a comprehensive suite of valuation tools designed to
          cater for a wide range of property types. Our products include
          Residential Valua, Rating Valua, and Commercial Valua, each tailored
          to meet specific valuation needs with precision and reliability.
        </p>
        <div className="flex flex-wrap justify-between gap-6">
          <div className="flex-1 border rounded-2xl shadow-custom transition-transform duration-[500ms] transform hover:translate-y-[-10px]">
            <img
              src="/images/main/Commercial.png"
              alt="Commercial"
              className="m-auto pb-3"
            />
            <div className="pb-4 px-6">
              <h4 className="text-center text-dark dark:text-gray-700/80 mb-[14px] text-[32px] font-semibold">
                Commercial
              </h4>
              <p className="text-center dark:text-dark-6 font-thin text-black text-l">
                The ultimate tool for valuing commercial properties. It offers
                the choice between the Income Capitalization Method and the
                Discounted Cash Flow (DCF) methods. This flexibility allows
                valuers to select the most suitable approach for each valuation.
              </p>
            </div>
          </div>
          <div className="flex-1 border rounded-2xl shadow-custom transition-transform duration-[500ms] transform hover:translate-y-[-10px]">
            <img
              src="/images/main/Residential.png"
              alt="Residential"
              className="m-auto pb-3"
            />
            <div className="pb-4 px-6">
              <h4 className="text-center text-dark dark:text-gray-700/80 mb-[14px] text-[32px] font-semibold">
                Residential
              </h4>
              <p className="text-center dark:text-dark-6 font-thin text-black text-l">
                Is engineered for accuracy and efficiency in valuing residential
                properties. It employs the full comparable method for properties
                with sufficient market data and resorts to the cost method in
                scenarios where comparables are not available.
              </p>
            </div>
          </div>
          <div className="flex-1 border rounded-2xl shadow-custom transition-transform duration-[500ms] transform hover:translate-y-[-10px]">
            <img
              src="/images/main/Rating.png"
              alt="Rating"
              className="m-auto pb-3"
            />
            <div className="pb-4 px-6">
              <h4 className="text-center text-dark dark:text-gray-700/80 mb-[14px] text-[32px] font-semibold">
                Rating
              </h4>
              <p className="text-center dark:text-dark-6 font-thin text-black text-l">
                Utilizes the depreciated replacement cost method, meticulously
                accounting for obsolescence and other depreciating factors. This
                tool empowers valuers to conduct thorough and precise
                valuations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-stretch p-10 bg-[#3b82f6] rounded-2xl m-auto container">
        <h1 className="text-white font-bold text-[38px] text-center pb-3">
          Properties Detail
        </h1>
        <h3 className="text-white  font-thin text-xl text-center pb-10">
          Here is Realvalue property details.
        </h3>
        <CenteredView
          innerProps={{
            className: twMerge(
              "flex flex-col justify-center items-center p-0 pt-0 gap-12 bg-transparent",
            ),
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 pt-1">
            <div className="flex flex-col justify-center items-center text-center pt-3 gap-2 px-10 mobile-hidden">
              <span className="text-[42px] text-white font-bold">
                {numRes.toLocaleString("en-US")}
              </span>
              <br />
              <span className="text-xl text-white font-normal">
                Residential Properties
              </span>
            </div>
            <div className="flex flex-col justify-center items-center text-center pt-3 gap-2 px-10 mobile-hidden">
              <span className="text-[42px] font-bold text-white ">
                {numComm.toLocaleString("en-US")}
              </span>
              <br />
              <span className="text-xl text-white font-normal">
                Commercial Properties
              </span>
            </div>
            <div className="flex flex-col justify-center items-center text-center pt-3 gap-2 px-10 mobile-hidden">
              <span className="text-[42px] text-white font-bold">
                {numValuers.toLocaleString("en-US")}
              </span>
              <br />
              <span className="text-xl text-white font-normal">
                Using Valua
              </span>
            </div>
          </div>
          {/* <span className="text-3xl font-light text-stone-400 text-center pt-12">Valuing more than 40,000 residential, commercial, industrial and undeveloped land</span> */}
          {/* <ScrollingClients logos={clientLogos} animationDuration={30} /> */}
        </CenteredView>
      </section>
      <section
        id="contact"
        className="relative z-10 overflow-hidden bg-gray-1 dark:bg-dark py-20 lg:py-[140px]"
      >
        <div className="container mx-auto">
          <div className="flex flex-wrap -mx-4 lg:justify-between">
            <div className="w-full px-4">
              <div className="mb-12 max-w-full lg:mb-0 logo-margin">
                <h2 className="animate-fade-up text-dark dark:text-black mb-6 text-3xl font-bold sm:text-[38px] lg:text-text-3xl xl:text-[38px]">
                  Get in Touch With Us!
                </h2>
                <p className="text-xl font-thin max-w-[1045px]  leading-relaxed mb-9">
                  If you would like to understand the full capabilities of our
                  technology and advisory services, or get a better
                  understanding of the broader offerings delivered by RealValua,
                  our sales team would be happy to guide you.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 text-center sm:text-left mb-10">
                  <div className="flex items-center gap-3">
                    <img
                      src="/images/main/phone.svg"
                      alt="Phone"
                      className="w-6 h-6"
                    />
                    <p className="text-base leading-relaxed font-thin dark:text-dark-6">
                      (+267) 393 45678
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <img
                      src="/images/main/email.svg"
                      alt="Email"
                      className="w-6 h-6 transform duration-300"
                    />
                    <a
                      href="mailto:info@realvalua.com"
                      className="text-base leading-relaxed font-thin dark:text-dark-6 hover:underline"
                    >
                      info@realvalua.com
                    </a>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src="/images/main/location.svg"
                      alt="Location"
                      className="w-6 h-6"
                    />
                    <p className="text-base leading-relaxed font-thin dark:text-dark-6">
                      Plot 123, Unit 65, Fairgrounds Mall, Gaborone, Botswana
                    </p>
                  </div>
                </div>
                <div className="mt-8 mb-8 flex w-full">
                  <ContactForm></ContactForm>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
