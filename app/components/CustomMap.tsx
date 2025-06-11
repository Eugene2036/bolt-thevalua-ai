import GoogleComponent from "./GoogleComponent"

interface Props {
    lat?: number;
    long?: number;
    label?: string;
}
export function CustomMap(props: Props) {
    const { lat, long, label } = props;

    return (
        <div className="flex flex-col items-stretch print:hidden m-4">
            <GoogleComponent latitude={Number(lat)} longitude={Number(long)} mapLabel={String(label)} />
        </div>
    )
}