import React, { useState, useRef, useEffect } from "react";
import "../styles/auth.css";

export const COUNTRIES = [
  { code: "+91", iso: "IN", name: "India", flag: "🇮🇳", digits: 10, placeholder: "98765 43210" },
  { code: "+1", iso: "US", name: "United States", flag: "🇺🇸", digits: 10, placeholder: "202 555 0123" },
  { code: "+44", iso: "GB", name: "United Kingdom", flag: "🇬🇧", digits: 10, placeholder: "7911 123456" },
  { code: "+1", iso: "CA", name: "Canada", flag: "🇨🇦", digits: 10, placeholder: "416 555 0199" },
  { code: "+61", iso: "AU", name: "Australia", flag: "🇦🇺", digits: 9, placeholder: "412 345 678" },
  { code: "+971", iso: "AE", name: "United Arab Emirates", flag: "🇦🇪", digits: 9, placeholder: "50 123 4567" },
  { code: "+65", iso: "SG", name: "Singapore", flag: "🇸🇬", digits: 8, placeholder: "8123 4567" },
  { code: "+49", iso: "DE", name: "Germany", flag: "🇩🇪", digits: 11, placeholder: "151 23456789" },
];

const CountryPhoneInput = ({
  countryCode = "+91",
  onCountryChange,
  phone = "",
  onPhoneChange,
  disabled = false,
  required = false,
  id = "phone-input",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePhoneInputChange = (e) => {
    // Only allow digits
    const raw = e.target.value.replace(/\D/g, "");
    const trimmed = raw.slice(0, selectedCountry.digits);
    onPhoneChange(trimmed);
  };

  const handleCountrySelect = (country) => {
    onCountryChange(country.code);
    setIsOpen(false);
    // Truncate current phone if exceeds new country digit length
    if (phone.length > country.digits) {
      onPhoneChange(phone.slice(0, country.digits));
    }
  };

  return (
    <div className="country-phone-wrapper" ref={dropdownRef}>
      {/* Country Selector Trigger */}
      <div className="country-select-box">
        <button
          type="button"
          className="country-select-btn"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          title={`Country: ${selectedCountry.name} (${selectedCountry.code})`}
        >
          <span className="country-flag">{selectedCountry.flag}</span>
          <span className="country-dial-code">{selectedCountry.code}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="country-dropdown-menu">
            {COUNTRIES.map((c) => (
              <button
                key={`${c.iso}-${c.code}`}
                type="button"
                className={`country-option ${c.code === selectedCountry.code && c.iso === selectedCountry.iso ? "selected" : ""}`}
                onClick={() => handleCountrySelect(c)}
              >
                <span className="country-flag">{c.flag}</span>
                <span className="country-name">{c.name}</span>
                <span className="country-digits-hint">({c.digits} digits)</span>
                <span className="country-code-badge">{c.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phone Number Input */}
      <div className="phone-input-field-wrapper">
        <input
          id={id}
          type="tel"
          value={phone}
          onChange={handlePhoneInputChange}
          placeholder={selectedCountry.placeholder}
          maxLength={selectedCountry.digits}
          disabled={disabled}
          required={required}
          className="phone-number-input"
          autoComplete="tel-national"
        />
        <span className="phone-digit-counter">
          {phone.length}/{selectedCountry.digits}
        </span>
      </div>
    </div>
  );
};

export default CountryPhoneInput;
