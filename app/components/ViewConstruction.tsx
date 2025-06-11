import { ConstructionItem } from "~/models/con-items"

interface Props {
    items: ConstructionItem[]
}
export function ViewConstruction(props: Props) {
    const { items } = props
    return (
        <table className="m-4">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Comment</th>
                </tr>
            </thead>
            <tbody>
                {items.map((i, index) => (
                    <tr key={index}>
                        <td><b>{i.identifier}</b></td>
                        <td>{i.comment || '-'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}