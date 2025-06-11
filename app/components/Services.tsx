import { Checkbox } from '@mui/material';
import { useState } from 'react';

interface Props {
  services: string[];
}

export function Services(props: Props) {
  const { services: initServices } = props;

  const [services, setServices] = useState<string[]>(initServices || []);

  const options = ['Bitumen Sealed Road', 'Telephone', 'Borehole Water', 'Mains Water', 'Borehole & Mains', 'Mains Electricity', 'Solar Electricity', 'Mains & Solar', 'Sewerage'].map((identifier) => {
    const selected = services.some((service) => service === identifier);
    return { identifier, selected };
  });

  const handleChange = (identifier: string) => {
    return setServices((prevState) => {
      const selected = prevState.some((el) => el === identifier);
      if (selected) {
        return prevState.filter((el) => el !== identifier);
      }
      return [...prevState, identifier];
    });
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      <input type="hidden" name="services" value={JSON.stringify(services)} />
      {options.map((option) => (
        <div key={option.identifier} className="flex flex-row items-center gap-2">
          <Checkbox id={option.identifier} onChange={(_) => handleChange(option.identifier)} checked={option.selected} />
          <label htmlFor={option.identifier}>{option.identifier}</label>
        </div>
      ))}
    </div>
  );
}
