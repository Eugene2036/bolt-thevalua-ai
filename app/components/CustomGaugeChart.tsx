import GaugeChart from 'react-gauge-chart';

interface Props {
  perc: number;
}
export function CustomGaugeChart(props: Props) {
  const { perc } = props;

  return (
    <div className="flex flex-col items-stretch">
      <GaugeChart
        id="gauge-chart3"
        nrOfLevels={3}
        colors={['#EA4228', '#F5CD19', '#5BE12C']}
        textColor="#000"
        animate={false}
        percent={perc}
        // percent={0.56}
        needleColor="#e1e1e1"
      />
    </div>
  );
}
