import { useCallback, useState, type ComponentProps, useEffect } from 'react';
import Select from 'react-select';
import { z } from 'zod';

import { useField } from './ActionContextProvider';

type CustomOption = { value: string; label: string };

type Props = ComponentProps<typeof Select> & {
  clearInput?: boolean;
  name: string;
  options: string[];
  defaultValue: string[];
};
export function SelectNeighbourhoods(props: Props) {
  const { clearInput, name, defaultValue, options, ...restOfProps } = props;
  const { value, error: errors } = useField(name);

  const getParsedValue = useCallback((data: string | File | undefined) => {
    if (typeof data !== 'string') {
      return undefined;
    }
    try {
      const result = z.string().array().safeParse(JSON.parse(data));
      if (!result.success) {
        return undefined;
      }
      return result.data.map((el) => ({ value: el, label: el }));
    } catch (error) {
      return undefined;
    }
  }, []);

  const [selectedItems, setSelectedItems] = useState<CustomOption[]>(defaultValue?.map((value) => ({ label: value, value })) || getParsedValue(value) || []);

  useEffect(() => {
    if (clearInput) {
      setSelectedItems([]);
    }
  }, [clearInput]);

  const mappedOptions = options.map((option) => ({
    value: option,
    label: option,
  }));

  const handleChange = useCallback((newValue: unknown) => {
    setSelectedItems(newValue as CustomOption[]);
  }, []);

  return (
    <div className="flex flex-col items-stretch">
      <input type="hidden" name={name} value={JSON.stringify(selectedItems.map((el) => el.value))} />
      <div className={'flex flex-col items-stretch gap-0'}>
        <div className="flex flex-col items-start justify-center">
          <span className="text-sm font-light text-stone-600">Neighbourhoods</span>
        </div>
        <div className="flex grow flex-col items-stretch">
          <Select
            isMulti
            name="selectSupportTypes"
            classNamePrefix="select"
            options={mappedOptions}
            // defaultValue={supportTypes}
            key={`my_unique_select_key__${selectedItems.toString()}`}
            value={selectedItems}
            onChange={handleChange}
            placeholder="Select neighbourhoods"
            classNames={{
              control: () => 'rounded-md border border-stone-400 bg-zinc-50 text-sm font-light shadow-inner outline-none focus:ring-1 focus:ring-zinc-400',
            }}
            {...restOfProps}
          />
        </div>
      </div>
      {errors?.length && (
        <span className="text-xs font-light text-red-500" id={`${name}-error`}>
          {errors.join(', ')}
        </span>
      )}
    </div>
  );
}
