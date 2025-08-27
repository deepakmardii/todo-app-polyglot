use axum::{
    extract::{Query, State, TypedHeader},
    routing::get,
    Router, Json,
    http::{StatusCode, header::AUTHORIZATION},
};
use mongodb::{bson::doc, options::ClientOptions, Client, Database};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm, TokenData};
use axum::headers::Authorization;
use axum::headers::authorization::Bearer;
use axum::middleware::{self, Next};
use axum::response::Response;
use axum::RequestPartsExt;

#[derive(Clone)]
struct AppState {
    db: Database,
    jwt_secret: String,
}

#[derive(Deserialize)]
struct SearchParams {
    q: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct Task {
    #[serde(rename = "_id")]
    id: String,
    title: String,
    description: String,
}

async fn jwt_auth<B>(
    State(state): State<Arc<AppState>>,
    TypedHeader(Authorization(bearer)): TypedHeader<Authorization<Bearer>>,
    req: axum::http::Request<B>,
    next: Next<B>,
) -> Result<Response, StatusCode> {
    let token = bearer.token();
    let key = DecodingKey::from_secret(state.jwt_secret.as_bytes());
    let validation = Validation::new(Algorithm::HS256);
    decode::<serde_json::Value>(token, &key, &validation)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;
    Ok(next.run(req).await)
}

async fn search_handler(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchParams>,
) -> Result<Json<Vec<Task>>, StatusCode> {
    let filter = doc! {
        "$or": [
            { "title": { "$regex": &params.q, "$options": "i" } },
            { "description": { "$regex": &params.q, "$options": "i" } }
        ]
    };
    let mut cursor = state
        .db
        .collection::<Task>("tasks")
        .find(filter, None)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut results = Vec::new();
    use futures::StreamExt;
    while let Some(task) = cursor
        .next()
        .await
        .transpose()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    {
        results.push(task);
    }
    Ok(Json(results))
}

#[tokio::main]
async fn main() {
    let mongo_uri = std::env::var("MONGO_URI").unwrap_or_else(|_| "mongodb://localhost:27017".to_string());
    let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "supersecretkey".to_string());

    let client_options = ClientOptions::parse(&mongo_uri).await.unwrap();
    let client = Client::with_options(client_options).unwrap();
    let db = client.database("todo_shared");

    let state = Arc::new(AppState { db, jwt_secret });

    let app = Router::new()
        .route("/search", get(search_handler))
        .layer(middleware::from_fn_with_state(state.clone(), jwt_auth))
        .with_state(state);

    println!("Search service running on http://0.0.0.0:8084");
    axum::Server::bind(&"0.0.0.0:8084".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
