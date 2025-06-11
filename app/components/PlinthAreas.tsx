interface Props {
    records: {
        identifier: string;
        unit: string;
        size: number;
    }[]
}
export function PlinthAreas(props: Props) {
    const { records } = props;

    console.log('records', records);

    return (
        <div className="flex flex-col items-stretch m-4">
            <table>
                <thead>
                    <tr>
                        <th>Identifier</th>
                        <th>Unit</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((r, index) => (
                        <tr key={index}>
                            <td>{r.identifier}</td>
                            <td>{r.unit || '-'}</td>
                            <td>{r.size}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}