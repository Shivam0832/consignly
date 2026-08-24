import Layout from "../../components/Layout";
import OrderForm from "../../components/OrderForm";

export default function CreateOrderAdmin() {
  return (
    <Layout title="Create Order" subtitle="Place an order on behalf of a registered customer">
      <OrderForm asAdmin />
    </Layout>
  );
}
