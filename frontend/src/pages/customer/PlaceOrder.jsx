import Layout from "../../components/Layout";
import OrderForm from "../../components/OrderForm";

export default function PlaceOrder() {
  return (
    <Layout title="Book a delivery" subtitle="The price updates as you fill in the details. Nothing is booked until you confirm.">
      <OrderForm />
    </Layout>
  );
}
