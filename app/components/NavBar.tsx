import { useState, useRef, useEffect } from "react";
import logo from "~/../public/images/logo_dark.png";
import logoLight from "~/../public/images/logo_light.png";
import { useLocation, useNavigate } from "@remix-run/react";
import residential from "~/../public/images/residential.png";
import tools from "~/../public/images/tools.png";
import { CenteredView } from "~/components/CenteredView";
import { Footer } from "~/components/Footer";
import { UnderLineOnHover } from "~/components/UnderLineOnHover";
import { UnderLineHeading } from "~/components/UnderLinedHeading";
import { prisma } from "~/db.server";
import { AppLinks } from "~/models/links";
import { ValuationType } from "~/models/plots.validations";
import { Link, useLoaderData } from "@remix-run/react";
import { twMerge } from "tailwind-merge";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navbarStyle = {
    position: "fixed",
    top: 0,
    width: "100%",
    height: "72px",
    zIndex: 1000,
    backgroundColor: "white",
    padding: "0px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  };

  const toolbarItems: [string, string][] = [
    // ['Home', '/'],
    ["About", "#about"],
    ["Services", "#services"],
    ["Contact Us", "#contact"],
  ];

  const smoothScroll = (event, targetId) => {
    event.preventDefault();

    if (location.pathname === "/") {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(`/#${targetId}`);
    }
  };

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav style={navbarStyle}>
      <header className={`flex flex-row items-center`}>
        {/* <div className="h-[3vh] bg-slate-400/80 text-lime-500 float-right">
      Call us: +267 393 12345
    </div> */}
        <CenteredView
          className="grow"
          innerProps={{ className: twMerge("grow") }}
        >
          <div className="container">
            <div className="relative -mx-4 flex items-center justify-between">
              <div className="w-60 max-w-full px-4 logo-margin">
                <a href="/" className="block w-full py-3">
                  <img src={logoLight} alt="logo" className="dark:hidden" />
                  <img
                    src={logoLight}
                    alt="logo"
                    className="hidden dark:block"
                  />
                </a>
              </div>
              <div className="flex w-full items-center justify-end px-4">
                <div>
                  {/* <button
                onClick={() => setIsOpen(!open)}
                id="navbarToggler"
                className={` ${
                  open && "navbarTogglerActive"
                } absolute right-4 top-1/2 logo-margin block -translate-y-1/2 rounded-lg px-3 py-[6px] ring-primary focus:ring-2 lg:hidden bg-body-color dark:bg-slate-500`}
              >
                <span className="relative my-[6px] block h-[2px] w-[30px] bg-body-color dark:bg-white"></span>
                <span className="relative my-[6px] block h-[2px] w-[30px] bg-body-color dark:bg-white"></span>
                <span className="relative my-[6px] block h-[2px] w-[30px] bg-body-color dark:bg-white"></span>
              </button>
              {isOpen && (
                <ul className="absolute bg-white text-gray-700 pt-1 mt-1 shadow-lg rounded-md w-48">
                  <li>
                    <a className="block px-4 py-2 hover:bg-gray-100" href="#about">About</a>
                  </li>
                  <li>
                    <a className="block px-4 py-2 hover:bg-gray-100" href="#services">Services</a>
                  </li>
                  <li>
                    <a className="block px-4 py-2 hover:bg-gray-100" href="#contact">Contact Us</a>
                  </li>
                  <li>
                    <a className="block px-4 py-2 hover:bg-gray-100" href="#/login">Sign In</a>
                  </li>
                </ul>
              )} */}

                  <button
                    id="navbarToggler"
                    onClick={() => setIsOpen(!isOpen)}
                    className={` ${open && "navbarTogglerActive"
                      } absolute right-4 top-1/2 logo-margin block -translate-y-1/2 rounded-lg px-3 py-[6px] ring-primary focus:ring-2 lg:hidden bg-body-color dark:bg-slate-500`}
                  >
                    <span className="relative my-[6px] block h-[2px] w-[30px] bg-body-color dark:bg-white"></span>
                    <span className="relative my-[6px] block h-[2px] w-[30px] bg-body-color dark:bg-white"></span>
                    <span className="relative my-[6px] block h-[2px] w-[30px] bg-body-color dark:bg-white"></span>
                  </button>
                  {isOpen && (
                    <ul className="absolute bg-white text-gray-700 pt-1 mt-1 shadow-lg rounded-md w-48">
                      <li>
                        <a
                          // href="#"
                          className="block px-4 py-2 hover:bg-gray-100"
                          href="#about"
                        >
                          About
                        </a>
                      </li>
                      <li>
                        <a
                          // href="#"
                          className="block px-4 py-2 hover:bg-gray-100"
                          href="#services"
                        >
                          Services
                        </a>
                      </li>
                      <li>
                        <a
                          className="block px-4 py-2 hover:bg-gray-100"
                          href="#contact"
                        >
                          Contact Us
                        </a>
                      </li>
                      <li>
                        <a
                          className="block px-4 py-2 hover:bg-gray-100"
                          href="/signin"
                        >
                          Sign In
                        </a>
                      </li>
                    </ul>
                  )}

                  <nav
                    // :className="!navbarOpen && 'hidden' "
                    id="navbarCollapse"
                    className={`absolute right-4 top-full w-full max-w-[250px] rounded-lg bg-white px-6 py-5 shadow dark:bg-dark-2 lg:static lg:block lg:w-full lg:max-w-full lg:shadow-none lg:dark:bg-transparent ${!open && "hidden"
                      } `}
                  >
                    <div className="grow" />
                    <div className="md:flex flex-row items-center gap-16 hidden">
                      <Link key="Home" to="/" className="scroll-smooth">
                        <UnderLineOnHover>
                          <span className="text-black tracking-widest font-normal text-m">
                            Home
                          </span>
                        </UnderLineOnHover>
                      </Link>
                      {toolbarItems.map((item) => (
                        <Link
                          key={item[0]}
                          to={item[1]}
                          onClick={(e) => smoothScroll(e, item[1].substring(1))}
                        >
                          <UnderLineOnHover>
                            <span className="text-black tracking-widest font-normal text-m">
                              {item[0]}
                            </span>
                          </UnderLineOnHover>
                        </Link>
                        // <Link key={item[0]} to={item[1]} >
                        //   <UnderLineOnHover>
                        //     <span className="text-sky-600 tracking-widest font-thin text-m">{item[0]}</span>
                        //   </UnderLineOnHover>
                        // </Link>
                      ))}
                    </div>
                  </nav>
                </div>
                <div className="hidden justify-end pr-16 sm:flex lg:pr-0">
                  <Link
                    to="/login"
                    className="rounded-md bg-blue-500 px-7 py-3  font-normal text-white hover:bg-blue-700"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </CenteredView>
      </header>
    </nav>
  );
};

export default Navbar;
