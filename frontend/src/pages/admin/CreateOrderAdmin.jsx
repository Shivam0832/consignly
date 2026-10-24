import Layout from "../../components/Layout";
import OrderForm from "../../components/OrderForm";

export default function CreateOrderAdmin() {
  return (
    <Layout title="Book for a customer" subtitle="Place an order on behalf of a registered customer.">
      <OrderForm asAdmin />
    </Layout>
  );
}
