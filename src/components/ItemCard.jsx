import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";

function ItemCard({ item, addToCart }) {
  return (
    <Card className="h-100 shadow bg-dark text-white border-secondary">
      <Card.Img
        variant="top"
        src={item.image}
        alt={item.name}
      />

      <Card.Body className="d-flex flex-column">
        <Card.Title>{item.name}</Card.Title>

        <Card.Text>{item.price} Gold</Card.Text>

        <Button
          variant="warning"
          className="mt-auto"
          onClick={() => addToCart(item)}
        >
          Add to Cart
        </Button>
      </Card.Body>
    </Card>
  );
}

export default ItemCard;