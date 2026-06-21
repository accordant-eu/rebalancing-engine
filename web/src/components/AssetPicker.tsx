import React, { useState, useEffect } from 'react';

interface Asset {
  instrumentId: string;
  isin: string;
  ticker: string;
  exchangeMic: string;
  currency: string;
}

interface AssetPickerProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  token: string;
}

export const AssetPicker = React.forwardRef<HTMLSelectElement, AssetPickerProps>(({ token, ...rest }, ref) => {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch('/api/assets', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setAssets(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch assets', err);
      }
    };
    if (token) {
      fetchAssets();
    }
  }, [token]);

  return (
    <select ref={ref} className="formInput" {...rest}>
      <option value="" disabled>Select an Asset</option>
      {assets.map((asset) => (
        <option key={asset.instrumentId} value={asset.instrumentId}>
          {asset.ticker} ({asset.currency}) - {asset.exchangeMic}
        </option>
      ))}
    </select>
  );
});
