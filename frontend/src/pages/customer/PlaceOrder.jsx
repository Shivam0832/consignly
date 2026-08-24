import Layout from "../../components/Layout";
import OrderForm from "../../components/OrderForm";

export default function PlaceOrder() {
  return (
    <Layout title="Place an Order" subtitle="Get an instant quote, then confirm to book your delivery">
      <OrderForm />
    </Layout>
  );
}
