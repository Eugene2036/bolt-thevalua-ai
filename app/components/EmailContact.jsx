import { useState } from "react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    workEmail: "",
    workPhone: "",
    role: "",
    businessSector: "",
    message: "",
  });

  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const result = await response.json();
      toast.success("Message sent successfully!");
    } catch (err) {
      if (err instanceof TypeError) {
        console.error("TypeError: ", err.message);
        setError("There was a problem sending your message.");
        toast.Error("There was a problem sending your message.");
      } else {
        console.error("An error occurred:", err.message);
        setError("Unexpected error occurred.");
      }
    }
    setFormData({
      firstName: "",
      lastName: "",
      workEmail: "",
      workPhone: "",
      role: "",
      businessSector: "",
      message: "",
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: "100%", margin: "0 auto" }}
    >
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}
        className="text-gray-700/80"
      >
        <div style={{ flex: "1 1 45%" }}>
          <input
            type="text"
            name="firstName"
            placeholder="First name"
            value={formData.firstName}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              backgroundColor: "#FAFAFA",
            }}
            className="global-input mt-5"
          />
        </div>
        <div style={{ flex: "1 1 45%" }}>
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="global-input mt-5"
          />
        </div>
        <div style={{ flex: "1 1 45%" }}>
          <input
            type="email"
            name="workEmail"
            placeholder="Work Email"
            value={formData.workEmail}
            onChange={handleChange}
            required
            className="global-input mt-5"
          />
        </div>
        <div style={{ flex: "1 1 45%" }}>
          <select
            name="businessSector"
            required
            value={formData.businessSector}
            onChange={handleChange}
            className="global-input mt-5"
          >
            <option value="">Select a Sector</option>
            <option value="Commercial Appraisers">Commercial Appraisers</option>
            <option value="Commercial Lenders">Commercial Lenders</option>
            <option value="Public Sector">Public Sector</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div style={{ flex: "1 1 45%" }}>
          <input
            type="text"
            name="role"
            placeholder="Role"
            value={formData.role}
            onChange={handleChange}
            required
            className="global-input mt-5"
          />
        </div>
        <div style={{ flex: "1 1 45%" }}>
          <input
            type="phone"
            name="workPhone"
            placeholder="Work Phone"
            value={formData.workPhone}
            onChange={handleChange}
            required
            className="global-input mt-5"
          />
        </div>
        <div style={{ flex: "1 1 100%" }}>
          <textarea
            name="message"
            value={formData.message}
            placeholder="Message"
            onChange={handleChange}
            rows="4"
            required
            className="global-input mt-5"
          ></textarea>
        </div>
      </div>
      {error && <p style={{ color: "red", width: "100%" }}>{error}</p>}
      <button
        type="submit"
        style={{ marginTop: "16px" }}
        className="inline-flex w-[380px] text-white bg-blue-500 hover:bg-blue-700 items-center justify-center rounded-md border border-primary px-7 py-3 text-center text-base font-medium hover:text-white transition-all duration-150 tracking-wider drop-shadow-sm"
      >
        Just Send{" "}
        <img src="/images/main/Arrow.svg" alt="Location" className="ml-1" />
      </button>
    </form>
  );
}
